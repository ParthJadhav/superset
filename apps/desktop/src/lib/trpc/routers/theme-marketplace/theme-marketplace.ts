import { posix } from "node:path";
import { TRPCError } from "@trpc/server";
import { type ParseError, parse as parseJsonc } from "jsonc-parser";
import JSZip from "jszip";
import { parse as parsePlist } from "plist";
import {
	convertVSCodeTheme,
	type Theme,
	type VSCodeColorTheme,
} from "shared/themes";
import { z } from "zod";
import { publicProcedure, router } from "../..";

const OPEN_VSX_ORIGIN = "https://open-vsx.org";
const MAX_VSIX_SIZE = 25 * 1024 * 1024;
const MAX_MANIFEST_SIZE = 512 * 1024;
const MAX_THEME_FILE_SIZE = 1024 * 1024;
const MAX_THEMES_PER_EXTENSION = 40;
const REQUEST_TIMEOUT_MS = 15_000;

const extensionSummarySchema = z.object({
	name: z.string(),
	namespace: z.string(),
	version: z.string(),
	displayName: z.string().optional(),
	description: z.string().optional(),
	verified: z.boolean().optional(),
	downloadCount: z.number().optional(),
	averageRating: z.number().optional(),
	deprecated: z.boolean().optional(),
	files: z
		.object({
			icon: z.string().url().optional(),
		})
		.passthrough()
		.optional(),
});

const searchResponseSchema = z.object({
	totalSize: z.number(),
	extensions: z.array(extensionSummarySchema),
});

const extensionVersionSchema = z.object({
	files: z.object({
		download: z.string().url(),
	}),
});

const themeContributionSchema = z.object({
	label: z.string(),
	uiTheme: z.enum(["vs", "vs-dark", "hc-black", "hc-light"]).optional(),
	path: z.string(),
});

const extensionManifestSchema = z.object({
	name: z.string(),
	displayName: z.string().optional(),
	description: z.string().optional(),
	version: z.string(),
	publisher: z.string().optional(),
	contributes: z
		.object({
			themes: z.array(themeContributionSchema).optional(),
		})
		.optional(),
});

export interface ThemeMarketplaceExtension {
	id: string;
	namespace: string;
	name: string;
	version: string;
	displayName: string;
	description?: string;
	verified: boolean;
	downloadCount: number;
	averageRating?: number;
	iconUrl?: string;
}

interface ThemeExtensionMetadata {
	namespace: string;
	name: string;
	version: string;
	displayName?: string;
	description?: string;
}

function parseJsoncObject(content: string, label: string): unknown {
	const errors: ParseError[] = [];
	const parsed: unknown = parseJsonc(content, errors, {
		allowTrailingComma: true,
		disallowComments: false,
	});
	if (errors.length > 0 || parsed === undefined) {
		throw new Error(`${label} is not valid JSON`);
	}
	return parsed;
}

function validateOpenVSXUrl(value: string): URL {
	const url = new URL(value);
	if (url.origin !== OPEN_VSX_ORIGIN || url.protocol !== "https:") {
		throw new Error("Open VSX returned an unexpected download URL");
	}
	return url;
}

function safeArchivePath(base: string, relativePath: string): string {
	const withoutLeadingSlash = relativePath.replace(/^\.?\//, "");
	const path = posix.normalize(posix.join(base, withoutLeadingSlash));
	if (!path.startsWith("extension/") || path.includes("\0")) {
		throw new Error("Theme extension contains an unsafe file path");
	}
	return path;
}

async function readZipText(
	zip: JSZip,
	path: string,
	maxSize: number,
): Promise<string> {
	const entry = zip.file(path);
	if (!entry) throw new Error(`Theme extension is missing ${path}`);
	const declaredSize = (
		entry as JSZip.JSZipObject & {
			_data?: { uncompressedSize?: number };
		}
	)._data?.uncompressedSize;
	if (declaredSize !== undefined && declaredSize > maxSize) {
		throw new Error(`${path} exceeds the supported size limit`);
	}
	const bytes = await entry.async("uint8array");
	if (bytes.byteLength > maxSize) {
		throw new Error(`${path} exceeds the supported size limit`);
	}
	return new TextDecoder().decode(bytes);
}

function mergeVSCodeThemes(
	base: VSCodeColorTheme,
	child: VSCodeColorTheme,
): VSCodeColorTheme {
	const baseTokenColors = Array.isArray(base.tokenColors)
		? base.tokenColors
		: undefined;
	const childTokenColors = Array.isArray(child.tokenColors)
		? child.tokenColors
		: undefined;

	return {
		...base,
		...child,
		include: undefined,
		colors: {
			...(base.colors ?? {}),
			...(child.colors ?? {}),
		},
		tokenColors:
			childTokenColors && baseTokenColors
				? [...baseTokenColors, ...childTokenColors]
				: (child.tokenColors ?? base.tokenColors),
		semanticTokenColors: {
			...(base.semanticTokenColors ?? {}),
			...(child.semanticTokenColors ?? {}),
		},
	};
}

function parseTextMateTheme(content: string): VSCodeColorTheme["tokenColors"] {
	const parsed: unknown = parsePlist(content);
	if (
		typeof parsed !== "object" ||
		parsed === null ||
		!("settings" in parsed) ||
		!Array.isArray((parsed as { settings?: unknown }).settings)
	) {
		throw new Error("TextMate theme does not contain a settings array");
	}

	return (parsed as { settings: unknown[] }).settings.flatMap((entry) => {
		if (typeof entry !== "object" || entry === null) return [];
		const rule = entry as {
			scope?: unknown;
			settings?: {
				foreground?: unknown;
				background?: unknown;
				fontStyle?: unknown;
			};
		};
		if (
			typeof rule.scope !== "string" &&
			!Array.isArray(rule.scope) &&
			rule.scope !== undefined
		) {
			return [];
		}
		const scope =
			typeof rule.scope === "string"
				? rule.scope
				: Array.isArray(rule.scope)
					? rule.scope.filter(
							(value): value is string => typeof value === "string",
						)
					: undefined;
		return [
			{
				scope,
				settings: {
					foreground:
						typeof rule.settings?.foreground === "string"
							? rule.settings.foreground
							: undefined,
					background:
						typeof rule.settings?.background === "string"
							? rule.settings.background
							: undefined,
					fontStyle:
						typeof rule.settings?.fontStyle === "string"
							? rule.settings.fontStyle
							: undefined,
				},
			},
		];
	});
}

async function loadVSCodeTheme(
	zip: JSZip,
	archivePath: string,
	visited: Set<string>,
	issues: string[],
): Promise<VSCodeColorTheme> {
	if (visited.has(archivePath)) {
		throw new Error(`Theme include cycle detected at ${archivePath}`);
	}
	visited.add(archivePath);

	const content = await readZipText(zip, archivePath, MAX_THEME_FILE_SIZE);
	const parsed = parseJsoncObject(content, archivePath) as VSCodeColorTheme;
	let theme = parsed;

	if (parsed.include) {
		const includePath = safeArchivePath(
			posix.dirname(archivePath),
			parsed.include,
		);
		const base = await loadVSCodeTheme(zip, includePath, visited, issues);
		theme = mergeVSCodeThemes(base, parsed);
	}

	if (typeof theme.tokenColors === "string") {
		const tokenPath = safeArchivePath(
			posix.dirname(archivePath),
			theme.tokenColors,
		);
		if (tokenPath.endsWith(".json")) {
			const tokenContent = await readZipText(
				zip,
				tokenPath,
				MAX_THEME_FILE_SIZE,
			);
			const tokenJson = parseJsoncObject(tokenContent, tokenPath);
			const tokenColors = Array.isArray(tokenJson)
				? tokenJson
				: typeof tokenJson === "object" &&
						tokenJson !== null &&
						"tokenColors" in tokenJson &&
						Array.isArray((tokenJson as { tokenColors?: unknown }).tokenColors)
					? (tokenJson as { tokenColors: VSCodeColorTheme["tokenColors"] })
							.tokenColors
					: undefined;
			theme = { ...theme, tokenColors };
		} else if (tokenPath.endsWith(".tmTheme") || tokenPath.endsWith(".plist")) {
			try {
				const tokenContent = await readZipText(
					zip,
					tokenPath,
					MAX_THEME_FILE_SIZE,
				);
				theme = {
					...theme,
					tokenColors: parseTextMateTheme(tokenContent),
				};
			} catch (error) {
				issues.push(
					`${posix.basename(archivePath)}: ${
						error instanceof Error
							? error.message
							: "Unable to parse TextMate syntax rules"
					}`,
				);
				theme = { ...theme, tokenColors: undefined };
			}
		} else {
			issues.push(
				`${posix.basename(archivePath)} references an unsupported token color file.`,
			);
			theme = { ...theme, tokenColors: undefined };
		}
	}

	visited.delete(archivePath);
	return theme;
}

export async function extractThemesFromVSIX(
	vsix: ArrayBuffer | Uint8Array,
	metadata: ThemeExtensionMetadata,
): Promise<{ themes: Theme[]; issues: string[] }> {
	const zip = await JSZip.loadAsync(vsix);
	const manifestContent = await readZipText(
		zip,
		"extension/package.json",
		MAX_MANIFEST_SIZE,
	);
	const manifest = extensionManifestSchema.parse(
		parseJsoncObject(manifestContent, "extension/package.json"),
	);
	const contributions = manifest.contributes?.themes ?? [];
	if (contributions.length === 0) {
		throw new Error("This extension does not declare any color themes");
	}
	if (contributions.length > MAX_THEMES_PER_EXTENSION) {
		throw new Error(
			`Theme packs are limited to ${MAX_THEMES_PER_EXTENSION} themes`,
		);
	}

	const extensionId = `${metadata.namespace}.${metadata.name}`;
	const issues: string[] = [];
	const themes: Theme[] = [];

	for (const contribution of contributions) {
		try {
			const archivePath = safeArchivePath("extension", contribution.path);
			const config = await loadVSCodeTheme(zip, archivePath, new Set(), issues);
			const type =
				contribution.uiTheme === "vs" || contribution.uiTheme === "hc-light"
					? "light"
					: "dark";
			themes.push(
				convertVSCodeTheme(config, {
					fallbackName: contribution.label,
					name: contribution.label,
					id: contribution.label,
					idPrefix: extensionId,
					author: manifest.publisher ?? metadata.namespace,
					version: metadata.version,
					description: metadata.description ?? manifest.description,
					type,
					source: {
						kind: "vscode",
						extensionId,
						version: metadata.version,
					},
				}),
			);
		} catch (error) {
			issues.push(
				`${contribution.label}: ${
					error instanceof Error ? error.message : "Unable to read theme"
				}`,
			);
		}
	}

	if (themes.length === 0) {
		throw new Error(issues[0] ?? "No compatible VS Code themes were found");
	}
	return { themes, issues };
}

async function fetchWithTimeout(url: URL): Promise<Response> {
	const response = await fetch(url, {
		headers: { Accept: "application/json" },
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!response.ok) {
		throw new Error(`Open VSX request failed (${response.status})`);
	}
	return response;
}

async function searchOpenVSX(
	query: string,
): Promise<ThemeMarketplaceExtension[]> {
	const url = new URL("/api/-/search", OPEN_VSX_ORIGIN);
	url.searchParams.set("query", query.trim() || "theme");
	url.searchParams.set("category", "Themes");
	url.searchParams.set("size", "20");
	const response = await fetchWithTimeout(url);
	const payload = searchResponseSchema.parse(await response.json());

	return payload.extensions
		.filter((extension) => !extension.deprecated)
		.map((extension) => ({
			id: `${extension.namespace}.${extension.name}`,
			namespace: extension.namespace,
			name: extension.name,
			version: extension.version,
			displayName: extension.displayName ?? extension.name.replaceAll("-", " "),
			description: extension.description,
			verified: extension.verified ?? false,
			downloadCount: extension.downloadCount ?? 0,
			averageRating: extension.averageRating,
			iconUrl: extension.files?.icon,
		}));
}

async function downloadOpenVSXExtension(input: {
	namespace: string;
	name: string;
	version: string;
}): Promise<ArrayBuffer> {
	const metadataUrl = new URL(
		`/api/${encodeURIComponent(input.namespace)}/${encodeURIComponent(input.name)}/${encodeURIComponent(input.version)}`,
		OPEN_VSX_ORIGIN,
	);
	const metadataResponse = await fetchWithTimeout(metadataUrl);
	const extension = extensionVersionSchema.parse(await metadataResponse.json());
	const downloadUrl = validateOpenVSXUrl(extension.files.download);
	const response = await fetch(downloadUrl, {
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!response.ok) {
		throw new Error(`Theme download failed (${response.status})`);
	}
	const contentLength = Number(response.headers.get("content-length") ?? 0);
	if (contentLength > MAX_VSIX_SIZE) {
		throw new Error("Theme extension is larger than 25 MB");
	}
	const bytes = await response.arrayBuffer();
	if (bytes.byteLength > MAX_VSIX_SIZE) {
		throw new Error("Theme extension is larger than 25 MB");
	}
	return bytes;
}

function toTRPCError(error: unknown): TRPCError {
	if (error instanceof TRPCError) return error;
	return new TRPCError({
		code: "BAD_REQUEST",
		message:
			error instanceof Error
				? error.message
				: "Unable to load themes from Open VSX",
		cause: error,
	});
}

export function createThemeMarketplaceRouter() {
	return router({
		search: publicProcedure
			.input(z.object({ query: z.string().trim().max(80) }))
			.query(async ({ input }) => {
				try {
					return await searchOpenVSX(input.query);
				} catch (error) {
					throw toTRPCError(error);
				}
			}),
		install: publicProcedure
			.input(
				z.object({
					namespace: z.string().min(1).max(100),
					name: z.string().min(1).max(100),
					version: z.string().min(1).max(100),
					displayName: z.string().max(200).optional(),
					description: z.string().max(2_000).optional(),
				}),
			)
			.mutation(async ({ input }) => {
				try {
					const bytes = await downloadOpenVSXExtension(input);
					return await extractThemesFromVSIX(bytes, input);
				} catch (error) {
					throw toTRPCError(error);
				}
			}),
	});
}
