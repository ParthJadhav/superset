import type { DashboardSidebarAgentChat } from "../../types";

export function sortAgentChats(
	chats: readonly DashboardSidebarAgentChat[],
	pinnedTerminalIds: readonly string[],
): DashboardSidebarAgentChat[] {
	const pinnedSet = new Set(pinnedTerminalIds);
	return [...chats].sort((left, right) => {
		const leftPinned = pinnedSet.has(left.terminalId);
		const rightPinned = pinnedSet.has(right.terminalId);
		if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
		return right.lastEventAt - left.lastEventAt;
	});
}

export function getWorkspacesWithoutAgentChats<
	TWorkspace extends { id: string },
>(
	workspaces: readonly TWorkspace[],
	chats: readonly Pick<DashboardSidebarAgentChat, "workspaceId">[],
): TWorkspace[] {
	const workspaceIdsWithChats = new Set(chats.map((chat) => chat.workspaceId));
	return workspaces.filter(
		(workspace) => !workspaceIdsWithChats.has(workspace.id),
	);
}
