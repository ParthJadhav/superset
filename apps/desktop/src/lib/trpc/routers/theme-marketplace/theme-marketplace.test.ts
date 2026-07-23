import { describe, expect, it } from "bun:test";
import JSZip from "jszip";
import { extractThemesFromVSIX } from "./theme-marketplace";

describe("extractThemesFromVSIX", () => {
	it("imports declared themes and resolves VS Code include files", async () => {
		const zip = new JSZip();
		zip.file(
			"extension/package.json",
			JSON.stringify({
				name: "sample-theme",
				displayName: "Sample Theme",
				version: "2.0.0",
				publisher: "example",
				contributes: {
					themes: [
						{
							label: "Sample Night",
							uiTheme: "vs-dark",
							path: "./themes/night.json",
						},
					],
				},
			}),
		);
		zip.file(
			"extension/themes/base.json",
			JSON.stringify({
				name: "Generic Theme Name",
				colors: {
					"editor.background": "#111318",
					"editor.foreground": "#e7e9ef",
					"terminal.ansiGreen": "#6fd49a",
				},
				tokenColors: "./tokens.tmTheme",
			}),
		);
		zip.file(
			"extension/themes/tokens.tmTheme",
			`<?xml version="1.0" encoding="UTF-8"?>
			<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
			<plist version="1.0">
				<dict>
					<key>settings</key>
					<array>
						<dict>
							<key>scope</key>
							<string>comment</string>
							<key>settings</key>
							<dict>
								<key>foreground</key>
								<string>#687181</string>
							</dict>
						</dict>
					</array>
				</dict>
			</plist>`,
		);
		zip.file(
			"extension/themes/night.json",
			`{
				"include": "./base.json",
				"colors": {
					"sideBar.background": "#171a21",
				},
			}`,
		);
		const bytes = await zip.generateAsync({ type: "uint8array" });

		const result = await extractThemesFromVSIX(bytes, {
			namespace: "example",
			name: "sample-theme",
			version: "2.0.0",
			displayName: "Sample Theme",
			description: "A sample VS Code theme",
		});

		expect(result.issues).toEqual([]);
		expect(result.themes).toHaveLength(1);
		expect(result.themes[0]?.id).toBe("example-sample-theme-sample-night");
		expect(result.themes[0]?.name).toBe("Sample Night");
		expect(result.themes[0]?.ui.background).toBe("#111318");
		expect(result.themes[0]?.ui.sidebar).toBe("#171a21");
		expect(result.themes[0]?.terminal?.green).toBe("#6fd49a");
		expect(result.themes[0]?.editor?.syntax?.comment).toBe("#687181");
		expect(result.themes[0]?.source).toEqual({
			kind: "vscode",
			extensionId: "example.sample-theme",
			version: "2.0.0",
		});
	});
});
