import { Database } from "bun:sqlite";
import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	parseLatestClaudeSessionTitle,
	readClaudeSessionTitle,
	readCodexSessionTitle,
} from "./session-title";

const temporaryDirectories: string[] = [];

function makeTemporaryDirectory() {
	const directory = mkdtempSync(join(tmpdir(), "superset-session-title-"));
	temporaryDirectories.push(directory);
	return directory;
}

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

describe("Codex session titles", () => {
	it("reads the title for the matching thread", async () => {
		const databasePath = join(makeTemporaryDirectory(), "state_5.sqlite");
		const database = new Database(databasePath);
		database.exec("CREATE TABLE threads (id TEXT PRIMARY KEY, title TEXT)");
		database
			.prepare("INSERT INTO threads (id, title) VALUES (?, ?)")
			.run("thread-1", " Fix the sidebar navigation ");
		database.close();

		expect(await readCodexSessionTitle(databasePath, "thread-1")).toBe(
			"Fix the sidebar navigation",
		);
		expect(
			await readCodexSessionTitle(databasePath, "missing"),
		).toBeUndefined();
	});
});

describe("Claude session titles", () => {
	it("selects the most recent valid ai-title record", () => {
		expect(
			parseLatestClaudeSessionTitle([
				'{"type":"ai-title","aiTitle":"First title"}',
				'{"type":"user","message":"ignore"}',
				'{"type":"ai-title","aiTitle":"Latest title"}',
			]),
		).toBe("Latest title");
	});

	it("reads backward across chunks without loading a large log at once", () => {
		const filePath = join(makeTemporaryDirectory(), "session.jsonl");
		writeFileSync(
			filePath,
			[
				'{"type":"ai-title","aiTitle":"Earlier title"}',
				`{"type":"assistant","message":"${"x".repeat(300_000)}"}`,
				'{"type":"ai-title","aiTitle":"Build the agent picker"}',
			].join("\n"),
		);

		expect(readClaudeSessionTitle(filePath)).toBe("Build the agent picker");
	});
});
