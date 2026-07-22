import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { AnimatePresence, motion } from "framer-motion";
import { type ComponentPropsWithoutRef, forwardRef, useMemo } from "react";
import { ProjectThumbnail } from "renderer/routes/_authenticated/components/ProjectThumbnail";
import { useAgentChatPinsStore } from "renderer/stores/agent-chat-pins";
import type {
	DashboardSidebarAgentChat,
	DashboardSidebarWorkspace,
} from "../../../../types";
import {
	getWorkspacesWithoutAgentChats,
	sortAgentChats,
} from "../../../../utils/agentChats";
import { DashboardSidebarAgentChatItem } from "../../../DashboardSidebarAgentChatItem";
import { DashboardSidebarWorkspaceItem } from "../../../DashboardSidebarWorkspaceItem";

interface DashboardSidebarCollapsedProjectContentProps
	extends ComponentPropsWithoutRef<"div"> {
	projectName: string;
	iconUrl: string | null;
	isCollapsed: boolean;
	totalItemCount: number;
	agentChats: DashboardSidebarAgentChat[];
	workspaces: DashboardSidebarWorkspace[];
	workspaceShortcutLabels: Map<string, string>;
	onWorkspaceHover: (workspaceId: string) => void | Promise<void>;
	onToggleCollapse: () => void;
}

export const DashboardSidebarCollapsedProjectContent = forwardRef<
	HTMLDivElement,
	DashboardSidebarCollapsedProjectContentProps
>(
	(
		{
			projectName,
			iconUrl,
			isCollapsed,
			totalItemCount,
			agentChats,
			workspaces,
			workspaceShortcutLabels,
			onWorkspaceHover,
			onToggleCollapse,
			className,
			...props
		},
		ref,
	) => {
		const pinnedTerminalIds = useAgentChatPinsStore(
			(state) => state.pinnedTerminalIds,
		);
		const orderedChats = useMemo(() => {
			return sortAgentChats(agentChats, pinnedTerminalIds);
		}, [agentChats, pinnedTerminalIds]);
		const fallbackWorkspaces = useMemo(
			() => getWorkspacesWithoutAgentChats(workspaces, agentChats),
			[workspaces, agentChats],
		);

		return (
			<div
				ref={ref}
				className={cn(
					"flex flex-col items-center py-2 border-b border-border last:border-b-0",
					className,
				)}
				{...props}
			>
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={onToggleCollapse}
							className={cn(
								"flex items-center justify-center size-8 rounded-md",
								"hover:bg-muted/50 transition-colors",
							)}
						>
							<ProjectThumbnail projectName={projectName} iconUrl={iconUrl} />
						</button>
					</TooltipTrigger>
					<TooltipContent side="right" className="flex flex-col gap-0.5">
						<span className="font-medium">{projectName}</span>
						<span className="text-xs text-muted-foreground">
							{totalItemCount} {agentChats.length > 0 ? "chat" : "workspace"}
							{totalItemCount !== 1 ? "s" : ""}
						</span>
					</TooltipContent>
				</Tooltip>

				<AnimatePresence initial={false}>
					{!isCollapsed && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.15, ease: "easeOut" }}
							className="overflow-hidden w-full"
						>
							<div className="flex w-full flex-col pt-1">
								{orderedChats.map((chat) => (
									<DashboardSidebarAgentChatItem
										key={chat.terminalId}
										chat={chat}
										isCollapsed
									/>
								))}
								{fallbackWorkspaces.map((workspace) => (
									<DashboardSidebarWorkspaceItem
										key={workspace.id}
										workspace={workspace}
										onHoverCardOpen={() => onWorkspaceHover(workspace.id)}
										shortcutLabel={workspaceShortcutLabels.get(workspace.id)}
										isCollapsed
									/>
								))}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		);
	},
);
