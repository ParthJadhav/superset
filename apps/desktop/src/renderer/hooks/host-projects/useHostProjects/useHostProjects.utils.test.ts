import { describe, expect, test } from "bun:test";
import {
	applyProjectChangedEvent,
	getHostProjectIconUrl,
	type HostProjectRow,
	mergeHostProjects,
	normalizeHostProjectRow,
} from "./useHostProjects.utils";

const BASE_ROW: HostProjectRow = {
	id: "project-1",
	name: "Superset",
	repoPath: "/repo/superset",
	repoOwner: "superset-sh",
	repoName: "superset",
	repoUrl: "https://github.com/superset-sh/superset",
	worktreeBaseDir: null,
	iconDataUrl: null,
	createdAt: 10,
	updatedAt: 20,
};

describe("host project icons", () => {
	test("normalizes mixed-version host rows without an icon field", () => {
		const { iconDataUrl } = normalizeHostProjectRow({
			id: "legacy",
			repoPath: "/repo/legacy",
		});
		expect(iconDataUrl).toBeNull();
	});

	test("patches a cached row from project:changed without blanking data", () => {
		const iconDataUrl = "data:image/png;base64,derived";
		const next = applyProjectChangedEvent(
			[BASE_ROW],
			{
				eventType: "updated",
				project: {
					...BASE_ROW,
					iconDataUrl,
					updatedAt: 30,
				},
			},
			BASE_ROW.id,
		);

		expect(next).toEqual([{ ...BASE_ROW, iconDataUrl, updatedAt: 30 }]);
	});

	test("keeps the local host's icon when replicas merge", () => {
		const localIcon = "data:image/png;base64,local";
		const projects = mergeHostProjects({
			hostResults: [
				{
					target: {
						machineId: "remote",
						organizationId: "org",
						hostUrl: "https://relay/remote",
						isLocal: false,
					},
					rows: [
						{
							...BASE_ROW,
							iconDataUrl: "data:image/png;base64,remote",
							updatedAt: 40,
						},
					],
					reachable: true,
				},
				{
					target: {
						machineId: "local",
						organizationId: "org",
						hostUrl: "http://127.0.0.1",
						isLocal: true,
					},
					rows: [{ ...BASE_ROW, iconDataUrl: localIcon }],
					reachable: true,
				},
			],
		});

		expect(projects[0]?.iconDataUrl).toBe(localIcon);
	});

	test("prefers a derived icon and falls back to the GitHub owner avatar", () => {
		expect(
			getHostProjectIconUrl({
				iconDataUrl: "data:image/png;base64,derived",
				repoOwner: "superset-sh",
			}),
		).toBe("data:image/png;base64,derived");
		expect(
			getHostProjectIconUrl({
				iconDataUrl: null,
				repoOwner: "superset-sh",
			}),
		).toBe("https://github.com/superset-sh.png?size=64");
	});
});
