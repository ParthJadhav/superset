import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { useAgentChatPinsStore } from "renderer/stores/agent-chat-pins";
import type {
	DashboardSidebarAgentChat,
	DashboardSidebarProjectChild,
} from "../../../../types";
import {
	getWorkspacesWithoutAgentChats,
	sortAgentChats,
} from "../../../../utils/agentChats";
import { getProjectChildrenWorkspaces } from "../../../../utils/projectChildren";
import { DashboardSidebarAgentChatItem } from "../../../DashboardSidebarAgentChatItem";
import { DashboardSidebarWorkspaceItem } from "../../../DashboardSidebarWorkspaceItem";

interface DashboardSidebarExpandedProjectContentProps {
	isCollapsed: boolean;
	projectChildren: DashboardSidebarProjectChild[];
	agentChats: DashboardSidebarAgentChat[];
	workspaceShortcutLabels: Map<string, string>;
	onWorkspaceHover: (workspaceId: string) => void | Promise<void>;
}

export function DashboardSidebarExpandedProjectContent({
	isCollapsed,
	projectChildren,
	agentChats,
	workspaceShortcutLabels,
	onWorkspaceHover,
}: DashboardSidebarExpandedProjectContentProps) {
	const pinnedTerminalIds = useAgentChatPinsStore(
		(state) => state.pinnedTerminalIds,
	);
	const orderedChats = useMemo(
		() => sortAgentChats(agentChats, pinnedTerminalIds),
		[agentChats, pinnedTerminalIds],
	);
	const workspaces = useMemo(
		() => getProjectChildrenWorkspaces(projectChildren),
		[projectChildren],
	);
	const fallbackWorkspaces = useMemo(
		() => getWorkspacesWithoutAgentChats(workspaces, agentChats),
		[workspaces, agentChats],
	);

	return (
		<AnimatePresence initial={false}>
			{!isCollapsed && (
				<motion.div
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: "auto", opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					transition={{ duration: 0.15, ease: "easeOut" }}
					className="overflow-hidden pb-1"
				>
					{orderedChats.map((chat) => (
						<DashboardSidebarAgentChatItem key={chat.terminalId} chat={chat} />
					))}

					{fallbackWorkspaces.length > 0 && orderedChats.length > 0 && (
						<div className="px-5 pb-1 pt-2 text-[10px] font-medium text-muted-foreground">
							No active chat
						</div>
					)}
					{fallbackWorkspaces.map((workspace) => (
						<DashboardSidebarWorkspaceItem
							key={workspace.id}
							workspace={workspace}
							onHoverCardOpen={() => onWorkspaceHover(workspace.id)}
							shortcutLabel={workspaceShortcutLabels.get(workspace.id)}
						/>
					))}
				</motion.div>
			)}
		</AnimatePresence>
	);
}
