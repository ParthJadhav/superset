import { describe, expect, it } from "bun:test";
import type { WorkspaceState } from "@superset/panes";
import {
	findPersistedTerminalTitle,
	resolveAgentChatTitle,
} from "./agent-chat-title";

describe("resolveAgentChatTitle", () => {
	it("keeps a descriptive explicit thread title", () => {
		expect(
			resolveAgentChatTitle({
				explicitTitle: "Fix flaky authentication tests",
				workspaceName: "Auth hardening",
				agentId: "codex",
			}),
		).toBe("Fix flaky authentication tests");
	});

	it("replaces generic agent and shell titles with the workspace summary", () => {
		for (const explicitTitle of ["Codex", "codex", "Terminal", "zsh"]) {
			expect(
				resolveAgentChatTitle({
					explicitTitle,
					workspaceName: "Improve agent navigation",
					agentId: "codex",
				}),
			).toBe("Improve agent navigation");
		}
	});

	it("uses the agent session title instead of a local workspace placeholder", () => {
		expect(
			resolveAgentChatTitle({
				explicitTitle: "local",
				sessionTitle: "Add terminal panel shortcut",
				workspaceName: "local",
				agentId: "codex",
			}),
		).toBe("Add terminal panel shortcut");
	});

	it("uses an agent-specific fallback when no meaningful title exists", () => {
		expect(
			resolveAgentChatTitle({
				explicitTitle: "Codex",
				workspaceName: "local",
				agentId: "codex",
			}),
		).toBe("Codex session");
	});

	it("preserves an explicit custom title over the agent session title", () => {
		expect(
			resolveAgentChatTitle({
				explicitTitle: "My custom label",
				sessionTitle: "Generated title",
				workspaceName: "local",
				agentId: "claude",
			}),
		).toBe("My custom label");
	});
});

describe("findPersistedTerminalTitle", () => {
	const layout: WorkspaceState<unknown> = {
		version: 1,
		activeTabId: "tab-1",
		tabs: [
			{
				id: "tab-1",
				createdAt: 1,
				activePaneId: "pane-1",
				layout: { type: "pane", paneId: "pane-1" },
				titleOverride: "Tab summary",
				panes: {
					"pane-1": {
						id: "pane-1",
						kind: "terminal",
						titleOverride: "Pane summary",
						data: { terminalId: "terminal-1" },
					},
				},
			},
		],
	};

	it("prefers the tab title for a matching terminal", () => {
		expect(findPersistedTerminalTitle(layout, "terminal-1")).toBe(
			"Tab summary",
		);
	});

	it("returns undefined for an unknown terminal", () => {
		expect(findPersistedTerminalTitle(layout, "terminal-2")).toBeUndefined();
	});
});
