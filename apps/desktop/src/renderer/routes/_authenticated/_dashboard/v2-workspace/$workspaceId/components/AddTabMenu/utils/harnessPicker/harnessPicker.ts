const HIDDEN_HARNESS_IDS_STORAGE_KEY = "v2-harness-picker-hidden-agent-ids";

export const MAX_HARNESS_NUMBER_SHORTCUTS = 4;

type HarnessPickerStorage = Pick<Storage, "getItem" | "setItem">;

function getBrowserStorage(): HarnessPickerStorage | null {
	return typeof localStorage === "undefined" ? null : localStorage;
}

export function getHarnessNumberShortcutIndex(key: string): number | null {
	if (!/^[1-4]$/.test(key)) return null;
	return Number(key) - 1;
}

export function parseHiddenHarnessIds(value: string | null): Set<string> {
	if (!value) return new Set();
	try {
		const parsed: unknown = JSON.parse(value);
		if (!Array.isArray(parsed)) return new Set();
		return new Set(parsed.filter((id): id is string => typeof id === "string"));
	} catch {
		return new Set();
	}
}

export function readHiddenHarnessIds(
	storage: HarnessPickerStorage | null = getBrowserStorage(),
): Set<string> {
	if (!storage) return new Set();
	try {
		return parseHiddenHarnessIds(
			storage.getItem(HIDDEN_HARNESS_IDS_STORAGE_KEY),
		);
	} catch {
		return new Set();
	}
}

export function writeHiddenHarnessIds(
	hiddenIds: ReadonlySet<string>,
	storage: HarnessPickerStorage | null = getBrowserStorage(),
): void {
	if (!storage) return;
	try {
		storage.setItem(
			HIDDEN_HARNESS_IDS_STORAGE_KEY,
			JSON.stringify([...hiddenIds].sort()),
		);
	} catch {
		// Visibility preferences are non-critical when storage is unavailable.
	}
}
