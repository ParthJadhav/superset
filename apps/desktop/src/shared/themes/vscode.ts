import { parse as parseColor } from "culori";
import { type ParseError, parse as parseJsonc } from "jsonc-parser";
import { darkTheme, lightTheme } from "./built-in";
import { getEditorTheme } from "./editor-theme";
import {
	getDefaultTerminalColors,
	type Theme,
	type ThemeSource,
} from "./types";
import { withAlpha } from "./utils";
import { isVisibleThemeColor, normalizeVSCodeTheme } from "./vscode-ui-colors";

export { normalizeVSCodeTheme } from "./vscode-ui-colors";

export interface VSCodeTokenColorRule {
	scope?: string | string[];
	settings?: {
		foreground?: string;
		background?: string;
		fontStyle?: string;
	};
}

export interface VSCodeColorTheme {
	name?: string;
	type?: "dark" | "light" | "hc" | "hcLight";
	include?: string;
	colors?: Record<string, string>;
	tokenColors?: VSCodeTokenColorRule[] | string;
	semanticTokenColors?: Record<
		string,
		string | { foreground?: string; fontStyle?: string }
	>;
	semanticHighlighting?: boolean;
}

export interface VSCodeThemeConversionOptions {
	fallbackName?: string;
	name?: string;
	id?: string;
	idPrefix?: string;
	author?: string;
	version?: string;
	description?: string;
	type?: "dark" | "light";
	source?: ThemeSource;
}

const ANSI_COLOR_KEYS = {
	black: "terminal.ansiBlack",
	red: "terminal.ansiRed",
	green: "terminal.ansiGreen",
	yellow: "terminal.ansiYellow",
	blue: "terminal.ansiBlue",
	magenta: "terminal.ansiMagenta",
	cyan: "terminal.ansiCyan",
	white: "terminal.ansiWhite",
	brightBlack: "terminal.ansiBrightBlack",
	brightRed: "terminal.ansiBrightRed",
	brightGreen: "terminal.ansiBrightGreen",
	brightYellow: "terminal.ansiBrightYellow",
	brightBlue: "terminal.ansiBrightBlue",
	brightMagenta: "terminal.ansiBrightMagenta",
	brightCyan: "terminal.ansiBrightCyan",
	brightWhite: "terminal.ansiBrightWhite",
} as const;

function isColor(value: string | undefined): value is string {
	return value !== undefined && parseColor(value) !== undefined;
}

export function normalizeThemeId(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function getColor(
	colors: Record<string, string>,
	...keys: string[]
): string | undefined {
	for (const key of keys) {
		const color = colors[key];
		if (color !== "default" && isColor(color)) return color;
	}
	return undefined;
}

function getVisibleColor(
	colors: Record<string, string>,
	...keys: string[]
): string | undefined {
	for (const key of keys) {
		const color = colors[key];
		if (color !== "default" && isVisibleThemeColor(color)) return color;
	}
	return undefined;
}

function normalizeScopes(scope: string | string[] | undefined): string[] {
	if (Array.isArray(scope)) return scope;
	if (!scope) return [];
	return scope.split(",").map((value) => value.trim());
}

function getTokenColor(
	tokenColors: VSCodeTokenColorRule[],
	scopes: string[],
): string | undefined {
	for (let index = tokenColors.length - 1; index >= 0; index--) {
		const rule = tokenColors[index];
		const foreground = rule?.settings?.foreground;
		if (!isColor(foreground)) continue;
		const ruleScopes = normalizeScopes(rule.scope);
		if (
			ruleScopes.some((ruleScope) =>
				scopes.some(
					(scope) =>
						ruleScope === scope ||
						ruleScope.startsWith(`${scope}.`) ||
						ruleScope.includes(scope),
				),
			)
		) {
			return foreground;
		}
	}
	return undefined;
}

function getSemanticColor(
	semanticTokenColors: VSCodeColorTheme["semanticTokenColors"],
	keys: string[],
): string | undefined {
	if (!semanticTokenColors) return undefined;
	for (const key of keys) {
		const value = semanticTokenColors[key];
		if (typeof value === "string" && isColor(value)) return value;
		if (isColor(value?.foreground)) return value.foreground;
	}
	return undefined;
}

function getSyntaxColor(
	config: VSCodeColorTheme,
	semanticKeys: string[],
	textMateScopes: string[],
	fallback: string,
): string {
	return (
		getSemanticColor(config.semanticTokenColors, semanticKeys) ??
		getTokenColor(
			Array.isArray(config.tokenColors) ? config.tokenColors : [],
			textMateScopes,
		) ??
		fallback
	);
}

function resolveThemeType(
	config: VSCodeColorTheme,
	options: VSCodeThemeConversionOptions,
): "dark" | "light" {
	if (options.type) return options.type;
	return config.type === "light" || config.type === "hcLight"
		? "light"
		: "dark";
}

/**
 * Convert a VS Code color theme into Superset's runtime theme contract.
 *
 * Superset has surfaces VS Code does not (charts, terminal panes, app-specific
 * sidebars), so this is intentionally a compatibility adapter. VS Code color
 * IDs remain the source of truth and missing values inherit from Superset's
 * light/dark defaults.
 */
export function convertVSCodeTheme(
	config: VSCodeColorTheme,
	options: VSCodeThemeConversionOptions = {},
): Theme {
	const type = resolveThemeType(config, options);
	const baseTheme = type === "light" ? lightTheme : darkTheme;
	const colors = config.colors ?? {};
	const name =
		options.name?.trim() ||
		config.name?.trim() ||
		options.fallbackName?.trim() ||
		"VS Code Theme";
	const idBase = options.id ?? name;
	const normalizedId = normalizeThemeId(idBase) || "vscode-theme";
	const id = options.idPrefix
		? `${normalizeThemeId(options.idPrefix)}-${normalizedId}`
		: normalizedId;

	const background =
		getColor(
			colors,
			"window.background",
			"editor.background",
			"sideBar.background",
		) ?? baseTheme.ui.background;
	const foreground =
		getColor(colors, "foreground", "editor.foreground", "sideBar.foreground") ??
		baseTheme.ui.foreground;
	const card =
		getColor(
			colors,
			"sideBar.background",
			"editorGroupHeader.tabsBackground",
			"panel.background",
		) ?? baseTheme.ui.card;
	const cardForeground =
		getColor(
			colors,
			"sideBar.foreground",
			"panelTitle.activeForeground",
			"foreground",
		) ?? foreground;
	const popover =
		getColor(
			colors,
			"quickInput.background",
			"menu.background",
			"editorWidget.background",
			"dropdown.background",
		) ?? baseTheme.ui.popover;
	const popoverForeground =
		getColor(
			colors,
			"quickInput.foreground",
			"menu.foreground",
			"editorWidget.foreground",
			"dropdown.foreground",
		) ?? foreground;
	const primary =
		getColor(
			colors,
			"button.background",
			"textLink.foreground",
			"focusBorder",
			"terminal.ansiBlue",
		) ?? baseTheme.ui.primary;
	const primaryForeground =
		getColor(colors, "button.foreground") ?? baseTheme.ui.primaryForeground;
	const secondary =
		getColor(
			colors,
			"button.secondaryBackground",
			"input.background",
			"editorWidget.background",
		) ?? baseTheme.ui.secondary;
	const secondaryForeground =
		getColor(
			colors,
			"button.secondaryForeground",
			"input.foreground",
			"editorWidget.foreground",
		) ?? foreground;
	const muted =
		getColor(
			colors,
			"list.inactiveSelectionBackground",
			"sideBarSectionHeader.background",
			"editorHoverWidget.background",
		) ?? baseTheme.ui.muted;
	const mutedForeground =
		getColor(
			colors,
			"descriptionForeground",
			"disabledForeground",
			"editorLineNumber.foreground",
		) ?? baseTheme.ui.mutedForeground;
	const accent =
		getColor(
			colors,
			"list.activeSelectionBackground",
			"list.focusBackground",
			"list.hoverBackground",
		) ?? baseTheme.ui.accent;
	const accentForeground =
		getColor(
			colors,
			"list.activeSelectionForeground",
			"list.focusForeground",
			"list.hoverForeground",
		) ?? foreground;
	const tertiary =
		getColor(
			colors,
			"editorGroupHeader.tabsBackground",
			"tab.inactiveBackground",
			"panel.background",
		) ?? baseTheme.ui.tertiary;
	const tertiaryActive =
		getColor(
			colors,
			"tab.activeBackground",
			"editorGroupHeader.noTabsBackground",
		) ?? baseTheme.ui.tertiaryActive;
	const destructive =
		getColor(
			colors,
			"errorForeground",
			"inputValidation.errorBorder",
			"terminal.ansiRed",
		) ?? baseTheme.ui.destructive;
	const destructiveForeground =
		getColor(colors, "inputValidation.errorForeground") ??
		baseTheme.ui.destructiveForeground;
	const border =
		getVisibleColor(
			colors,
			"contrastBorder",
			"panel.border",
			"sideBar.border",
			"editorGroup.border",
			"widget.border",
		) ?? baseTheme.ui.border;
	const input =
		getVisibleColor(
			colors,
			"settings.textInputBorder",
			"input.border",
			"panelInput.border",
		) ?? border;
	const controlBackground =
		getColor(
			colors,
			"settings.textInputBackground",
			"input.background",
			"dropdown.background",
		) ?? (type === "dark" ? withAlpha(input, 0.3) : "transparent");
	const ring =
		getColor(
			colors,
			"focusBorder",
			"list.focusOutline",
			"button.hoverBackground",
		) ?? baseTheme.ui.ring;
	const sidebar =
		getColor(
			colors,
			"sideBar.background",
			"activityBar.background",
			"editorGroupHeader.tabsBackground",
		) ?? baseTheme.ui.sidebar;
	const sidebarForeground =
		getColor(
			colors,
			"sideBar.foreground",
			"activityBar.foreground",
			"foreground",
		) ?? foreground;
	const sidebarPrimary =
		getColor(
			colors,
			"activityBarBadge.background",
			"sideBarTitle.foreground",
			"focusBorder",
		) ?? primary;
	const sidebarPrimaryForeground =
		getColor(colors, "activityBarBadge.foreground") ?? primaryForeground;
	const sidebarAccent =
		getColor(
			colors,
			"list.activeSelectionBackground",
			"list.hoverBackground",
		) ?? accent;
	const sidebarAccentForeground =
		getColor(
			colors,
			"list.activeSelectionForeground",
			"list.hoverForeground",
		) ?? accentForeground;
	const sidebarBorder =
		getVisibleColor(colors, "sideBar.border", "activityBar.border") ?? border;
	const sidebarRing = getColor(colors, "focusBorder") ?? ring;
	const highlightMatch =
		getColor(
			colors,
			"editor.findMatchBackground",
			"editor.findRangeHighlightBackground",
		) ?? withAlpha(primary, type === "dark" ? 0.24 : 0.18);
	const highlightActive =
		getColor(colors, "editor.findMatchHighlightBackground") ??
		withAlpha(primary, type === "dark" ? 0.48 : 0.32);

	const terminalDefaults = getDefaultTerminalColors(type);
	const terminal = {
		background:
			getColor(colors, "terminal.background", "editor.background") ??
			background,
		foreground:
			getColor(colors, "terminal.foreground", "editor.foreground") ??
			foreground,
		cursor:
			getColor(
				colors,
				"terminalCursor.foreground",
				"editorCursor.foreground",
			) ?? foreground,
		cursorAccent:
			getColor(
				colors,
				"terminalCursor.background",
				"editorCursor.background",
			) ?? background,
		selectionBackground:
			getColor(
				colors,
				"terminal.selectionBackground",
				"editor.selectionBackground",
			) ?? terminalDefaults.selectionBackground,
		selectionForeground: getColor(colors, "terminal.selectionForeground"),
		...Object.fromEntries(
			Object.entries(ANSI_COLOR_KEYS).map(([key, vscodeKey]) => [
				key,
				getColor(colors, vscodeKey) ??
					terminalDefaults[key as keyof typeof ANSI_COLOR_KEYS],
			]),
		),
	} as Theme["terminal"];

	const themeBase: Theme = {
		id,
		name,
		author: options.author,
		version: options.version,
		description: options.description,
		type,
		source: options.source ?? { kind: "vscode" },
		ui: {
			background,
			foreground,
			card,
			cardForeground,
			popover,
			popoverForeground,
			primary,
			primaryForeground,
			secondary,
			secondaryForeground,
			muted,
			mutedForeground,
			accent,
			accentForeground,
			tertiary,
			tertiaryActive,
			destructive,
			destructiveForeground,
			border,
			input,
			controlBackground,
			ring,
			sidebar,
			sidebarForeground,
			sidebarPrimary,
			sidebarPrimaryForeground,
			sidebarAccent,
			sidebarAccentForeground,
			sidebarBorder,
			sidebarRing,
			chart1: getColor(colors, "terminal.ansiRed") ?? baseTheme.ui.chart1,
			chart2: getColor(colors, "terminal.ansiGreen") ?? baseTheme.ui.chart2,
			chart3: getColor(colors, "terminal.ansiBlue") ?? baseTheme.ui.chart3,
			chart4: getColor(colors, "terminal.ansiYellow") ?? baseTheme.ui.chart4,
			chart5: getColor(colors, "terminal.ansiMagenta") ?? baseTheme.ui.chart5,
			highlightMatch,
			highlightActive,
			highlight: sidebarPrimary,
			highlightForeground: sidebarPrimaryForeground,
		},
		terminal,
	};
	const derivedEditor = getEditorTheme(themeBase);

	return normalizeVSCodeTheme({
		...themeBase,
		editor: {
			colors: {
				...derivedEditor.colors,
				background:
					getColor(colors, "editor.background") ??
					derivedEditor.colors.background,
				foreground:
					getColor(colors, "editor.foreground") ??
					derivedEditor.colors.foreground,
				border:
					getVisibleColor(colors, "editorGroup.border", "panel.border") ??
					derivedEditor.colors.border,
				cursor:
					getColor(colors, "editorCursor.foreground") ??
					derivedEditor.colors.cursor,
				gutterBackground:
					getColor(colors, "editorGutter.background", "editor.background") ??
					derivedEditor.colors.gutterBackground,
				gutterForeground:
					getColor(colors, "editorLineNumber.foreground") ??
					derivedEditor.colors.gutterForeground,
				activeLine:
					getColor(colors, "editor.lineHighlightBackground") ??
					derivedEditor.colors.activeLine,
				selection:
					getColor(colors, "editor.selectionBackground") ??
					derivedEditor.colors.selection,
				search: highlightMatch,
				searchActive: highlightActive,
				panel:
					getColor(colors, "editorWidget.background", "panel.background") ??
					derivedEditor.colors.panel,
				panelBorder:
					getVisibleColor(colors, "editorWidget.border", "panel.border") ??
					derivedEditor.colors.panelBorder,
				panelInputBackground:
					getColor(
						colors,
						"settings.textInputBackground",
						"input.background",
					) ?? derivedEditor.colors.panelInputBackground,
				panelInputForeground:
					getColor(colors, "input.foreground") ??
					derivedEditor.colors.panelInputForeground,
				panelInputBorder:
					getVisibleColor(
						colors,
						"settings.textInputBorder",
						"input.border",
						"panelInput.border",
					) ?? input,
				panelButtonBackground:
					getColor(colors, "button.background") ??
					derivedEditor.colors.panelButtonBackground,
				panelButtonForeground:
					getColor(colors, "button.foreground") ??
					derivedEditor.colors.panelButtonForeground,
				panelButtonBorder: getVisibleColor(colors, "button.border") ?? border,
				addition:
					getColor(
						colors,
						"gitDecoration.addedResourceForeground",
						"diffEditor.insertedTextBackground",
						"terminal.ansiGreen",
					) ?? derivedEditor.colors.addition,
				deletion:
					getColor(
						colors,
						"gitDecoration.deletedResourceForeground",
						"diffEditor.removedTextBackground",
						"terminal.ansiRed",
					) ?? derivedEditor.colors.deletion,
				modified:
					getColor(
						colors,
						"gitDecoration.modifiedResourceForeground",
						"terminal.ansiBlue",
					) ?? derivedEditor.colors.modified,
			},
			syntax: {
				plainText: getSyntaxColor(
					config,
					[],
					["source", "text"],
					derivedEditor.syntax.plainText,
				),
				comment: getSyntaxColor(
					config,
					["comment"],
					["comment"],
					derivedEditor.syntax.comment,
				),
				keyword: getSyntaxColor(
					config,
					["keyword", "modifier"],
					["keyword", "storage.type", "storage.modifier"],
					derivedEditor.syntax.keyword,
				),
				string: getSyntaxColor(
					config,
					["string"],
					["string.quoted", "string"],
					derivedEditor.syntax.string,
				),
				number: getSyntaxColor(
					config,
					["number"],
					["constant.numeric"],
					derivedEditor.syntax.number,
				),
				functionCall: getSyntaxColor(
					config,
					["function", "method"],
					["entity.name.function", "support.function", "variable.function"],
					derivedEditor.syntax.functionCall,
				),
				variableName: getSyntaxColor(
					config,
					["variable", "parameter"],
					["variable.other", "variable.parameter", "variable"],
					derivedEditor.syntax.variableName,
				),
				typeName: getSyntaxColor(
					config,
					["type", "interface", "enum"],
					["entity.name.type", "support.type", "storage.type"],
					derivedEditor.syntax.typeName,
				),
				className: getSyntaxColor(
					config,
					["class"],
					["entity.name.class", "support.class"],
					derivedEditor.syntax.className,
				),
				constant: getSyntaxColor(
					config,
					["enumMember", "constant"],
					["constant.language", "constant.other", "variable.other.constant"],
					derivedEditor.syntax.constant,
				),
				regexp: getSyntaxColor(
					config,
					["regexp"],
					["string.regexp"],
					derivedEditor.syntax.regexp,
				),
				tagName: getSyntaxColor(
					config,
					[],
					["entity.name.tag"],
					derivedEditor.syntax.tagName,
				),
				attributeName: getSyntaxColor(
					config,
					["property"],
					["entity.other.attribute-name"],
					derivedEditor.syntax.attributeName,
				),
				invalid: getSyntaxColor(
					config,
					[],
					["invalid"],
					derivedEditor.syntax.invalid,
				),
			},
		},
	});
}

export function parseVSCodeThemeJson(
	content: string,
): { ok: true; theme: VSCodeColorTheme } | { ok: false; error: string } {
	const errors: ParseError[] = [];
	const value: unknown = parseJsonc(content, errors, {
		allowTrailingComma: true,
		disallowComments: false,
	});
	if (errors.length > 0 || typeof value !== "object" || value === null) {
		return { ok: false, error: "Invalid VS Code theme JSON" };
	}
	return { ok: true, theme: value as VSCodeColorTheme };
}

export function isVSCodeColorTheme(value: unknown): value is VSCodeColorTheme {
	if (typeof value !== "object" || value === null) return false;
	const theme = value as Record<string, unknown>;
	if ("tokenColors" in theme || "semanticTokenColors" in theme) return true;
	if (typeof theme.include === "string") return true;
	if (typeof theme.colors !== "object" || theme.colors === null) return false;
	return Object.keys(theme.colors).some((key) => key.includes("."));
}
