import { describe, expect, test } from "bun:test";
import type { HostAgentConfig } from "@superset/host-service/settings";
import { getCompatibleLogoAgents } from "./ProjectLogoField.utils";

function config(
	id: string,
	presetId: string,
	overrides: Partial<HostAgentConfig> = {},
): HostAgentConfig {
	return {
		id,
		presetId,
		iconId: null,
		label: presetId,
		command: presetId,
		args: [],
		promptTransport: "argv",
		promptArgs: [],
		env: {},
		order: 0,
		...overrides,
	};
}

describe("getCompatibleLogoAgents", () => {
	test("keeps configured built-ins with a read-only one-shot command", () => {
		expect(
			getCompatibleLogoAgents([
				config("claude-instance", "claude"),
				config("codex-instance", "codex", {
					label: "Work Codex",
					iconId: "cursor-agent",
				}),
			]),
		).toEqual([
			{
				id: "claude-instance",
				label: "claude",
				iconId: "claude",
			},
			{
				id: "codex-instance",
				label: "Work Codex",
				iconId: "cursor-agent",
			},
		]);
	});

	test("excludes custom, chat, and built-ins without headless support", () => {
		expect(
			getCompatibleLogoAgents([
				config("custom-instance", "custom"),
				config("polygraph-instance", "polygraph"),
				config("chat-instance", "superset"),
			]),
		).toEqual([]);
	});
});
