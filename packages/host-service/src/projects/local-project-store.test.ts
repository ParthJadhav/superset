import { Database } from "bun:sqlite";
import { describe, expect, mock, test } from "bun:test";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { HostDb } from "../db";
import * as schema from "../db/schema";
import { projects } from "../db/schema";
import type { EventBus } from "../events";
import { updateLocalProject } from "./local-project-store";

const MIGRATIONS_FOLDER = resolve(import.meta.dir, "../../drizzle");

describe("updateLocalProject", () => {
	test("persists an icon and broadcasts it in project:changed", () => {
		const sqlite = new Database(":memory:");
		const db = drizzle(sqlite, { schema });
		migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
		const projectId = crypto.randomUUID();
		db.insert(projects)
			.values({
				id: projectId,
				name: "Example",
				repoPath: "/tmp/example",
			})
			.run();
		const broadcastProjectChanged = mock(() => {});
		const eventBus = {
			broadcastProjectChanged,
		} as unknown as EventBus;
		const iconDataUrl = "data:image/png;base64,normalized";

		const updated = updateLocalProject(
			{ db: db as unknown as HostDb, eventBus },
			projectId,
			{ iconDataUrl },
		);

		expect(updated?.iconDataUrl).toBe(iconDataUrl);
		expect(broadcastProjectChanged).toHaveBeenCalledTimes(1);
		expect(broadcastProjectChanged).toHaveBeenCalledWith(
			expect.objectContaining({
				projectId,
				eventType: "updated",
				project: expect.objectContaining({ iconDataUrl }),
			}),
		);
	});
});
