import { describe, expect, it } from "bun:test";
import { wcagContrast } from "culori";
import { darkTheme } from "./built-in";
import {
	convertVSCodeTheme,
	isVSCodeColorTheme,
	normalizeVSCodeTheme,
	parseVSCodeThemeJson,
} from "./vscode";

describe("VS Code theme compatibility", () => {
	it("parses JSONC theme files", () => {
		const result = parseVSCodeThemeJson(`{
			// VS Code themes commonly contain comments and trailing commas.
			"type": "dark",
			"colors": {
				"editor.background": "#101216",
			},
		}`);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.theme.colors?.["editor.background"]).toBe("#101216");
		expect(isVSCodeColorTheme(result.theme)).toBe(true);
	});

	it("maps VS Code workbench, terminal, and syntax colors", () => {
		const theme = convertVSCodeTheme(
			{
				name: "Night Test",
				type: "dark",
				colors: {
					"editor.background": "#101216",
					"editor.foreground": "#e6e8ec",
					"sideBar.background": "#151820",
					"button.background": "#7c8cff",
					"button.foreground": "#0b0d12",
					focusBorder: "#8fa0ff",
					"terminal.ansiRed": "#ff667a",
					"terminal.ansiGreen": "#72d49b",
					"terminal.ansiBlue": "#76a8ff",
					"terminal.ansiYellow": "#e8c66a",
					"terminal.ansiMagenta": "#c58cff",
					"terminal.ansiCyan": "#68d4dd",
				},
				tokenColors: [
					{
						scope: "comment",
						settings: { foreground: "#657080" },
					},
					{
						scope: ["keyword", "storage.type"],
						settings: { foreground: "#c58cff" },
					},
					{
						scope: "string.quoted",
						settings: { foreground: "#72d49b" },
					},
				],
			},
			{
				idPrefix: "publisher.extension",
				source: {
					kind: "vscode",
					extensionId: "publisher.extension",
					version: "1.2.3",
				},
			},
		);

		expect(theme.id).toBe("publisher-extension-night-test");
		expect(theme.ui.background).toBe("#101216");
		expect(theme.ui.sidebar).toBe("#151820");
		expect(theme.ui.primary).toBe("#7c8cff");
		expect(theme.terminal?.red).toBe("#ff667a");
		expect(theme.editor?.syntax?.comment).toBe("#657080");
		expect(theme.editor?.syntax?.keyword).toBe("#c58cff");
		expect(theme.editor?.syntax?.string).toBe("#72d49b");
		expect(theme.source?.extensionId).toBe("publisher.extension");
	});

	it("uses semantic token colors before TextMate scopes", () => {
		const theme = convertVSCodeTheme({
			name: "Semantic",
			type: "light",
			colors: {
				"editor.background": "#ffffff",
				"editor.foreground": "#202124",
			},
			tokenColors: [{ scope: "comment", settings: { foreground: "#777777" } }],
			semanticTokenColors: {
				comment: "#586070",
				function: { foreground: "#245cc7" },
			},
		});

		expect(theme.type).toBe("light");
		expect(theme.editor?.syntax?.comment).toBe("#586070");
		expect(theme.editor?.syntax?.functionCall).toBe("#245cc7");
	});

	it("ignores non-color values from untrusted theme files", () => {
		const theme = convertVSCodeTheme({
			name: "Safe Theme",
			type: "dark",
			colors: {
				"editor.background": "url(https://example.com/tracker)",
				"button.background": "not-a-color",
			},
			tokenColors: [
				{
					scope: "comment",
					settings: { foreground: "var(--unexpected-value)" },
				},
			],
		});

		expect(theme.ui.background).not.toContain("url(");
		expect(theme.ui.primary).not.toBe("not-a-color");
		expect(theme.editor?.syntax?.comment).not.toBe("var(--unexpected-value)");
	});

	it("does not promote low-contrast editor chrome to application helper text", () => {
		const theme = convertVSCodeTheme({
			name: "One Hunter-like",
			type: "dark",
			colors: {
				"editor.background": "#191d21",
				"editor.foreground": "#e0e0e0",
				"editorLineNumber.foreground": "#45505b",
				"sideBar.background": "#14181b",
				"sideBar.foreground": "#e0e0e0",
				"button.background": "#53a1fa",
				"button.foreground": "#e0e0e0",
			},
		});

		expect(
			wcagContrast(theme.ui.mutedForeground, theme.ui.background),
		).toBeGreaterThanOrEqual(4.5);
		expect(
			wcagContrast(theme.ui.mutedForeground, theme.ui.sidebar),
		).toBeGreaterThanOrEqual(4.5);
		expect(
			wcagContrast(theme.ui.primaryForeground, theme.ui.primary),
		).toBeGreaterThanOrEqual(4.5);
	});

	it("preserves filled controls when a VS Code theme uses transparent strokes", () => {
		const theme = convertVSCodeTheme({
			name: "Catppuccin-like",
			type: "light",
			colors: {
				"editor.background": "#eff1f5",
				"editor.foreground": "#4c4f69",
				"sideBar.background": "#e6e9ef",
				"panel.border": "#acb0be",
				"input.background": "#ccd0da",
				"input.border": "#00000000",
				"settings.textInputBackground": "#ccd0da",
				"settings.textInputBorder": "#00000000",
				"sideBar.border": "#00000000",
			},
		});

		expect(theme.ui.controlBackground).toBe("#ccd0da");
		expect(theme.ui.input).toBe("#acb0be");
		expect(theme.ui.sidebarBorder).toBe("#acb0be");
		expect(theme.editor?.colors?.panelInputBackground).toBe("#ccd0da");
		expect(theme.editor?.colors?.panelInputBorder).toBe("#acb0be");
	});

	it("upgrades already-persisted VS Code themes from editor control colors", () => {
		const converted = convertVSCodeTheme({
			name: "Legacy theme",
			type: "light",
			colors: {
				"editor.background": "#eff1f5",
				"editor.foreground": "#4c4f69",
				"sideBar.background": "#e6e9ef",
				"panel.border": "#acb0be",
				"input.background": "#ccd0da",
			},
		});
		const { controlBackground: _controlBackground, ...legacyUi } = converted.ui;
		const legacyTheme = {
			...converted,
			ui: {
				...legacyUi,
				input: "#00000000",
				mutedForeground: "#8c8fa1",
				sidebarBorder: "#00000000",
			},
		};

		const normalized = normalizeVSCodeTheme(legacyTheme);

		expect(normalized.ui.controlBackground).toBe("#ccd0da");
		expect(normalized.ui.input).toBe("#acb0be");
		expect(normalized.ui.sidebarBorder).toBe("#acb0be");
		expect(
			wcagContrast(normalized.ui.mutedForeground, normalized.ui.background),
		).toBeGreaterThanOrEqual(4.5);
	});

	it("leaves native Superset themes unchanged", () => {
		expect(normalizeVSCodeTheme(darkTheme)).toBe(darkTheme);
	});
});
