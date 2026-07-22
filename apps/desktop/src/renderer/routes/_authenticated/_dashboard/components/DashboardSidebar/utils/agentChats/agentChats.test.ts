import { describe, expect, it } from "bun:test";
import type { DashboardSidebarAgentChat } from "../../types";
import { getWorkspacesWithoutAgentChats, sortAgentChats } from "./agentChats";

function chat(
	terminalId: string,
	lastEventAt: number,
): DashboardSidebarAgentChat {
	return {
		terminalId,
		workspaceId: `workspace-${terminalId}`,
		workspaceName: "Workspace",
		projectId: "project",
		projectName: "Repository",
		agentId: "codex",
		status: "idle",
		title: terminalId,
		startedAt: lastEventAt,
		lastEventAt,
	};
}

describe("sortAgentChats", () => {
	it("puts pinned chats first and keeps each group activity ordered", () => {
		const ordered = sortAgentChats(
			[chat("old", 1), chat("new", 3), chat("pinned", 2)],
			["pinned"],
		);

		expect(ordered.map((item) => item.terminalId)).toEqual([
			"pinned",
			"new",
			"old",
		]);
	});

	it("does not mutate the source array", () => {
		const source = [chat("old", 1), chat("new", 2)];
		sortAgentChats(source, ["old"]);
		expect(source.map((item) => item.terminalId)).toEqual(["old", "new"]);
	});
});

describe("getWorkspacesWithoutAgentChats", () => {
	it("keeps agent-less workspaces reachable as fallbacks", () => {
		const workspaces = [{ id: "with-chat" }, { id: "without-chat" }];
		const fallbacks = getWorkspacesWithoutAgentChats(workspaces, [
			{ workspaceId: "with-chat" },
		]);

		expect(fallbacks).toEqual([{ id: "without-chat" }]);
	});
});
