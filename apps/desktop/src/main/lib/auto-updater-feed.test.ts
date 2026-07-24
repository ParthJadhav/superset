import { describe, expect, test } from "bun:test";
import { getUpdateFeedUrl } from "./auto-updater-feed";

describe("getUpdateFeedUrl", () => {
	test("targets the repository that built a stable fork release", () => {
		expect(getUpdateFeedUrl("ParthJadhav/superset", false)).toBe(
			"https://github.com/ParthJadhav/superset/releases/latest/download",
		);
	});

	test("targets the fork's rolling canary release", () => {
		expect(getUpdateFeedUrl("ParthJadhav/superset", true)).toBe(
			"https://github.com/ParthJadhav/superset/releases/download/desktop-canary",
		);
	});

	test.each([
		undefined,
		"",
		"owner",
		"owner/repo/extra",
		"owner repo/name",
	])("falls back to upstream for an invalid build repository: %s", (repository) => {
		expect(getUpdateFeedUrl(repository, false)).toBe(
			"https://github.com/superset-sh/superset/releases/latest/download",
		);
	});
});
