import {
	converter,
	formatHex,
	parse as parseColor,
	wcagContrast,
} from "culori";
import { darkTheme, lightTheme } from "./built-in";
import type { Theme } from "./types";
import { withAlpha } from "./utils";

const toRgb = converter("rgb");
const MIN_TEXT_CONTRAST = 4.5;
const MIN_STRUCTURAL_CONTRAST = 1.25;
const MIN_VISIBLE_ALPHA = 0.08;

export function isVisibleThemeColor(
	value: string | undefined,
): value is string {
	const parsed = value === undefined ? undefined : parseColor(value);
	return parsed !== undefined && (parsed.alpha ?? 1) >= MIN_VISIBLE_ALPHA;
}

function compositeColor(foreground: string, background: string): string {
	const foregroundRgb = toRgb(foreground);
	const backgroundRgb = toRgb(background);
	if (!foregroundRgb || !backgroundRgb) return foreground;

	const alpha = foregroundRgb.alpha ?? 1;
	return formatHex({
		mode: "rgb",
		r: (foregroundRgb.r ?? 0) * alpha + (backgroundRgb.r ?? 0) * (1 - alpha),
		g: (foregroundRgb.g ?? 0) * alpha + (backgroundRgb.g ?? 0) * (1 - alpha),
		b: (foregroundRgb.b ?? 0) * alpha + (backgroundRgb.b ?? 0) * (1 - alpha),
	});
}

function minimumContrast(color: string, backgrounds: string[]): number {
	return Math.min(
		...backgrounds.map((background) =>
			wcagContrast(compositeColor(color, background), background),
		),
	);
}

function mixColor(start: string, end: string, amount: number): string {
	const startRgb = toRgb(start);
	const endRgb = toRgb(end);
	if (!startRgb || !endRgb) return end;

	return formatHex({
		mode: "rgb",
		r: (startRgb.r ?? 0) + ((endRgb.r ?? 0) - (startRgb.r ?? 0)) * amount,
		g: (startRgb.g ?? 0) + ((endRgb.g ?? 0) - (startRgb.g ?? 0)) * amount,
		b: (startRgb.b ?? 0) + ((endRgb.b ?? 0) - (startRgb.b ?? 0)) * amount,
	});
}

function ensureContrast(
	color: string,
	backgrounds: string[],
	reference: string,
	minimum: number,
): string {
	if (minimumContrast(color, backgrounds) >= minimum) return color;

	const endpoint = [reference, "#000000", "#ffffff"].reduce(
		(best, candidate) =>
			minimumContrast(candidate, backgrounds) >
			minimumContrast(best, backgrounds)
				? candidate
				: best,
		reference,
	);

	if (minimumContrast(endpoint, backgrounds) < minimum) return endpoint;

	let low = 0;
	let high = 1;
	for (let index = 0; index < 12; index++) {
		const midpoint = (low + high) / 2;
		if (
			minimumContrast(mixColor(color, endpoint, midpoint), backgrounds) >=
			minimum
		) {
			high = midpoint;
		} else {
			low = midpoint;
		}
	}
	return mixColor(color, endpoint, high);
}

/**
 * Normalize semantic UI roles after adapting a VS Code workbench theme.
 *
 * VS Code can rely on low-contrast editor-only colors and filled controls with
 * transparent borders. Superset reuses these roles across navigation, helper
 * text, and form controls, so the adapted tokens need stronger guarantees.
 * This also upgrades VS Code themes persisted before these guarantees existed.
 */
export function normalizeVSCodeTheme(theme: Theme): Theme {
	if (theme.source?.kind !== "vscode") return theme;

	const baseTheme = theme.type === "light" ? lightTheme : darkTheme;
	const original = theme.ui;
	const foreground = ensureContrast(
		original.foreground,
		[original.background],
		original.foreground,
		MIN_TEXT_CONTRAST,
	);
	const borderCandidate = isVisibleThemeColor(original.border)
		? original.border
		: baseTheme.ui.border;
	const border = ensureContrast(
		borderCandidate,
		[original.background],
		foreground,
		MIN_STRUCTURAL_CONTRAST,
	);
	const rawControlBackground =
		original.controlBackground ??
		theme.editor?.colors?.panelInputBackground ??
		(theme.type === "dark" ? withAlpha(original.input, 0.3) : original.muted);
	const controlSurface = compositeColor(
		rawControlBackground,
		original.background,
	);
	const inputCandidate = isVisibleThemeColor(original.input)
		? original.input
		: border;
	const input = ensureContrast(
		inputCandidate,
		[controlSurface],
		foreground,
		MIN_STRUCTURAL_CONTRAST,
	);
	const sidebarBorderCandidate = isVisibleThemeColor(original.sidebarBorder)
		? original.sidebarBorder
		: border;
	const sidebarBorder = ensureContrast(
		sidebarBorderCandidate,
		[original.sidebar],
		foreground,
		MIN_STRUCTURAL_CONTRAST,
	);
	const primarySurface = compositeColor(original.primary, original.background);
	const secondarySurface = compositeColor(
		original.secondary,
		original.background,
	);
	const accentSurface = compositeColor(original.accent, original.background);
	const sidebarAccentSurface = compositeColor(
		original.sidebarAccent,
		original.sidebar,
	);
	const destructiveSurface = compositeColor(
		original.destructive,
		original.background,
	);

	return {
		...theme,
		ui: {
			...original,
			foreground,
			cardForeground: ensureContrast(
				original.cardForeground,
				[original.card],
				foreground,
				MIN_TEXT_CONTRAST,
			),
			popoverForeground: ensureContrast(
				original.popoverForeground,
				[original.popover],
				foreground,
				MIN_TEXT_CONTRAST,
			),
			primaryForeground: ensureContrast(
				original.primaryForeground,
				[primarySurface],
				foreground,
				MIN_TEXT_CONTRAST,
			),
			secondaryForeground: ensureContrast(
				original.secondaryForeground,
				[secondarySurface],
				foreground,
				MIN_TEXT_CONTRAST,
			),
			mutedForeground: ensureContrast(
				original.mutedForeground,
				[original.background, original.sidebar],
				foreground,
				MIN_TEXT_CONTRAST,
			),
			accentForeground: ensureContrast(
				original.accentForeground,
				[accentSurface],
				foreground,
				MIN_TEXT_CONTRAST,
			),
			destructiveForeground: ensureContrast(
				original.destructiveForeground,
				[destructiveSurface],
				foreground,
				MIN_TEXT_CONTRAST,
			),
			border,
			input,
			controlBackground: rawControlBackground,
			sidebarForeground: ensureContrast(
				original.sidebarForeground,
				[original.sidebar],
				foreground,
				MIN_TEXT_CONTRAST,
			),
			sidebarAccentForeground: ensureContrast(
				original.sidebarAccentForeground,
				[sidebarAccentSurface],
				foreground,
				MIN_TEXT_CONTRAST,
			),
			sidebarBorder,
		},
	};
}
