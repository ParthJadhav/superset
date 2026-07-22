import { describe, expect, it } from "bun:test";
import {
	getHarnessNumberShortcutIndex,
	parseHiddenHarnessIds,
	readHiddenHarnessIds,
	writeHiddenHarnessIds,
} from "./harnessPicker";

describe("harness picker preferences", () => {
	it("maps only number keys one through four to harness indexes", () => {
		expect(getHarnessNumberShortcutIndex("1")).toBe(0);
		expect(getHarnessNumberShortcutIndex("4")).toBe(3);
		expect(getHarnessNumberShortcutIndex("0")).toBeNull();
		expect(getHarnessNumberShortcutIndex("5")).toBeNull();
		expect(getHarnessNumberShortcutIndex("Digit1")).toBeNull();
	});

	it("restores only string harness ids from storage", () => {
		expect([...parseHiddenHarnessIds('["claude",2,"codex",null]')]).toEqual([
			"claude",
			"codex",
		]);
	});

	it("ignores missing or malformed storage", () => {
		expect([...parseHiddenHarnessIds(null)]).toEqual([]);
		expect([...parseHiddenHarnessIds("not-json")]).toEqual([]);
		expect([...parseHiddenHarnessIds('{"claude":true}')]).toEqual([]);
	});

	it("persists hidden harness ids for the next picker", () => {
		const values = new Map<string, string>();
		const storage = {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => values.set(key, value),
		};
		writeHiddenHarnessIds(new Set(["codex", "claude"]), storage);
		expect([...readHiddenHarnessIds(storage)]).toEqual(["claude", "codex"]);
	});
});
