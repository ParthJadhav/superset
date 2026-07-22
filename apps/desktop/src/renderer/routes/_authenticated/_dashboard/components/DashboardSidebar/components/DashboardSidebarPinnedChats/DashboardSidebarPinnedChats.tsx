import type { DashboardSidebarAgentChat } from "../../types";
import { DashboardSidebarAgentChatItem } from "../DashboardSidebarAgentChatItem";

interface DashboardSidebarPinnedChatsProps {
	chats: DashboardSidebarAgentChat[];
	isCollapsed: boolean;
}

export function DashboardSidebarPinnedChats({
	chats,
	isCollapsed,
}: DashboardSidebarPinnedChatsProps) {
	if (chats.length === 0) return null;

	return (
		<section
			aria-labelledby={isCollapsed ? undefined : "dashboard-pinned-chats"}
			aria-label={isCollapsed ? "Pinned chats" : undefined}
			className="border-b border-border py-1"
		>
			{!isCollapsed && (
				<h2
					id="dashboard-pinned-chats"
					className="px-5 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground"
				>
					Pinned
				</h2>
			)}
			{chats.map((chat) => (
				<DashboardSidebarAgentChatItem
					key={chat.terminalId}
					chat={chat}
					isCollapsed={isCollapsed}
					showProjectName
				/>
			))}
		</section>
	);
}
