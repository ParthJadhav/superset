// Theme types

// Built-in themes
export {
	builtInThemes,
	DEFAULT_THEME_ID,
	darkTheme,
	getBuiltInTheme,
	lightTheme,
	monokaiTheme,
} from "./built-in";
export { getEditorTheme } from "./editor-theme";
export {
	parseThemeConfigFile,
	type ThemeConfigParseOptions,
	type ThemeConfigParseResult,
} from "./import";
export type {
	EditorColors,
	EditorSyntaxColors,
	EditorTheme,
	TerminalColors,
	Theme,
	ThemeMetadata,
	ThemeSource,
	UIColors,
} from "./types";
export {
	DEFAULT_TERMINAL_COLORS_DARK,
	DEFAULT_TERMINAL_COLORS_LIGHT,
	getDefaultTerminalColors,
	getTerminalColors,
} from "./types";
export { withAlpha } from "./utils";
export {
	convertVSCodeTheme,
	isVSCodeColorTheme,
	normalizeThemeId,
	parseVSCodeThemeJson,
	type VSCodeColorTheme,
	type VSCodeThemeConversionOptions,
	type VSCodeTokenColorRule,
} from "./vscode";
