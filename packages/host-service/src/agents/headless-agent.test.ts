import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { HostDb } from "../db";
import * as schema from "../db/schema";
import { hostAgentConfigs } from "../db/schema";
import {
	resolveHeadlessAgent,
	supportsHeadlessAgentPreset,
} from "./headless-agent";

const MIGRATIONS_FOLDER = resolve(import.meta.dir, "../../drizzle");

function createTestDb(): HostDb {
	const sqlite = new Database(":memory:");
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
	return db as unknown as HostDb;
}

function insertAgent(
	db: HostDb,
	overrides: Partial<typeof hostAgentConfigs.$inferInsert> = {},
): string {
	const id = overrides.id ?? crypto.randomUUID();
	db.insert(hostAgentConfigs)
		.values({
			id,
			presetId: "codex",
			label: "My Codex",
			command: "/custom/bin/codex",
			argsJson: JSON.stringify(["--dangerously-bypass-approvals-and-sandbox"]),
			promptTransport: "argv",
			promptArgsJson: "[]",
			envJson: JSON.stringify({ PROFILE: "work" }),
			displayOrder: 0,
			...overrides,
		})
		.run();
	return id;
}

describe("resolveHeadlessAgent", () => {
	test("uses the configured executable and env with curated headless args", () => {
		const db = createTestDb();
		const id = insertAgent(db);

		const resolved = resolveHeadlessAgent(db, id);

		expect(resolved).toMatchObject({
			id,
			presetId: "codex",
			label: "My Codex",
		});
		expect(resolved?.command).toContain("PROFILE='work'");
		expect(resolved?.command).toContain("'/custom/bin/codex'");
		expect(resolved?.command).toContain("'exec' '--skip-git-repo-check'");
		expect(resolved?.command).not.toContain(
			"--dangerously-bypass-approvals-and-sandbox",
		);
	});

	test("injects a supported model before prompt-consuming flags", () => {
		const db = createTestDb();
		const id = insertAgent(db, {
			presetId: "gemini",
			command: "gemini-custom",
		});

		const resolved = resolveHeadlessAgent(db, id, "gemini-2.5-flash");

		expect(resolved?.command).toContain(
			"'gemini-custom' '--model' 'gemini-2.5-flash' '--skip-trust' '-p'",
		);
	});

	test("rejects custom and built-in agents without a one-shot contract", () => {
		const db = createTestDb();
		const customId = insertAgent(db, {
			presetId: "custom",
			command: "my-agent",
		});
		const polygraphId = insertAgent(db, {
			id: crypto.randomUUID(),
			presetId: "polygraph",
			command: "polygraph",
			displayOrder: 1,
		});

		expect(resolveHeadlessAgent(db, customId)).toBeNull();
		expect(resolveHeadlessAgent(db, polygraphId)).toBeNull();
		expect(supportsHeadlessAgentPreset("custom")).toBe(false);
		expect(supportsHeadlessAgentPreset("polygraph")).toBe(false);
		expect(supportsHeadlessAgentPreset("claude")).toBe(true);
	});
});
