import {
	closeSync,
	existsSync,
	fstatSync,
	openSync,
	readdirSync,
	readSync,
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import type { AgentIdentityId } from "@superset/shared/agent-catalog";

const CLAUDE_READ_CHUNK_BYTES = 256 * 1024;
const TITLE_CACHE_TTL_MS = 10_000;
const MAX_TITLE_LENGTH = 160;

interface CachedTitle {
	title: string | undefined;
	expiresAt: number;
}

const titleCache = new Map<string, CachedTitle>();

function normalizeTitle(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const normalized = value.trim().replace(/\s+/g, " ");
	if (!normalized) return undefined;
	if (normalized.length <= MAX_TITLE_LENGTH) return normalized;
	return `${normalized.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
}

function resolveConfiguredDirectory(
	value: string | undefined,
	fallback: string,
) {
	const configured = value?.trim() || fallback;
	return isAbsolute(configured) ? configured : resolve(configured);
}

function findCodexStateDatabase(codexHome: string): string | undefined {
	for (const candidate of [
		join(codexHome, "state_5.sqlite"),
		join(codexHome, "sqlite", "state_5.sqlite"),
	]) {
		if (existsSync(candidate)) return candidate;
	}
	return undefined;
}

interface RuntimeSqliteStatement {
	get: (...parameters: unknown[]) => unknown;
}

interface RuntimeSqliteDatabase {
	prepare?: (query: string) => RuntimeSqliteStatement;
	query?: (query: string) => RuntimeSqliteStatement;
	close: () => void;
}

interface RuntimeSqliteConstructor {
	new (path: string, options: Record<string, boolean>): RuntimeSqliteDatabase;
}

export async function readCodexSessionTitle(
	databasePath: string,
	sessionId: string,
): Promise<string | undefined> {
	let database: RuntimeSqliteDatabase | undefined;
	try {
		const isBunRuntime = typeof globalThis.Bun !== "undefined";
		const moduleSpecifier = isBunRuntime ? "bun:sqlite" : "node:sqlite";
		const sqliteModule = (await import(moduleSpecifier)) as unknown as {
			Database?: RuntimeSqliteConstructor;
			DatabaseSync?: RuntimeSqliteConstructor;
		};
		const DatabaseConstructor = isBunRuntime
			? sqliteModule.Database
			: sqliteModule.DatabaseSync;
		if (!DatabaseConstructor) return undefined;

		database = new DatabaseConstructor(
			databasePath,
			isBunRuntime ? { readonly: true, create: false } : { readOnly: true },
		);
		const sql = "SELECT title FROM threads WHERE id = ? LIMIT 1";
		const statement = database.prepare?.(sql) ?? database.query?.(sql);
		const row = statement?.get(sessionId) as { title?: unknown } | undefined;
		return normalizeTitle(row?.title);
	} catch {
		return undefined;
	} finally {
		database?.close();
	}
}

export function parseLatestClaudeSessionTitle(
	lines: readonly string[],
): string | undefined {
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		const line = lines[index]?.trim();
		if (!line || !line.includes("aiTitle")) continue;
		try {
			const record = JSON.parse(line) as {
				type?: unknown;
				aiTitle?: unknown;
			};
			if (record.type !== "ai-title") continue;
			const title = normalizeTitle(record.aiTitle);
			if (title) return title;
		} catch {
			// A chunk can begin in the middle of a JSONL record. Ignore it and
			// continue toward the start of the file.
		}
	}
	return undefined;
}

export function readClaudeSessionTitle(filePath: string): string | undefined {
	let descriptor: number | undefined;
	try {
		descriptor = openSync(filePath, "r");
		const size = fstatSync(descriptor).size;
		let position = size;
		let carry = "";

		while (position > 0) {
			const bytesToRead = Math.min(CLAUDE_READ_CHUNK_BYTES, position);
			position -= bytesToRead;
			const buffer = Buffer.allocUnsafe(bytesToRead);
			readSync(descriptor, buffer, 0, bytesToRead, position);
			const lines = `${buffer.toString("utf8")}${carry}`.split("\n");
			carry = lines.shift() ?? "";
			const title = parseLatestClaudeSessionTitle(lines);
			if (title) return title;
		}

		return parseLatestClaudeSessionTitle([carry]);
	} catch {
		return undefined;
	} finally {
		if (descriptor !== undefined) closeSync(descriptor);
	}
}

function findClaudeSessionFile(
	claudeConfigDirectory: string,
	sessionId: string,
): string | undefined {
	const projectsDirectory = join(claudeConfigDirectory, "projects");
	try {
		for (const entry of readdirSync(projectsDirectory, {
			withFileTypes: true,
		})) {
			if (!entry.isDirectory()) continue;
			const candidate = join(
				projectsDirectory,
				entry.name,
				`${sessionId}.jsonl`,
			);
			if (existsSync(candidate)) return candidate;
		}
	} catch {
		return undefined;
	}
	return undefined;
}

export interface ResolveAgentSessionTitleInput {
	agentId: AgentIdentityId;
	agentSessionId: string | undefined;
	/** Overrides are primarily for isolated tests. */
	homeDirectory?: string;
	codexHomeDirectory?: string;
	claudeConfigDirectory?: string;
}

/** Read the agent's own persisted session title without mutating its state. */
export async function resolveAgentSessionTitle({
	agentId,
	agentSessionId,
	homeDirectory = homedir(),
	codexHomeDirectory,
	claudeConfigDirectory,
}: ResolveAgentSessionTitleInput): Promise<string | undefined> {
	if (!agentSessionId) return undefined;

	const codexHome = resolveConfiguredDirectory(
		codexHomeDirectory ?? process.env.CODEX_HOME,
		join(homeDirectory, ".codex"),
	);
	const claudeConfig = resolveConfiguredDirectory(
		claudeConfigDirectory ?? process.env.CLAUDE_CONFIG_DIR,
		join(homeDirectory, ".claude"),
	);
	const cacheKey = `${agentId}:${agentSessionId}:${codexHome}:${claudeConfig}`;
	const cached = titleCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) return cached.title;

	let title: string | undefined;
	if (agentId === "codex") {
		const databasePath = findCodexStateDatabase(codexHome);
		if (databasePath) {
			title = await readCodexSessionTitle(databasePath, agentSessionId);
		}
	} else if (agentId === "claude") {
		const filePath = findClaudeSessionFile(claudeConfig, agentSessionId);
		if (filePath) title = readClaudeSessionTitle(filePath);
	}

	titleCache.set(cacheKey, {
		title,
		expiresAt: Date.now() + TITLE_CACHE_TTL_MS,
	});
	return title;
}
