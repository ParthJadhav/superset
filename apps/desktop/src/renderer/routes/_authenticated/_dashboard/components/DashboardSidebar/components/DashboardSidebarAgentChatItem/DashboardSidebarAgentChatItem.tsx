import { BUILTIN_AGENT_LABELS } from "@superset/shared/agent-catalog";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@superset/ui/context-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import {
	useLocation,
	useMatchRoute,
	useNavigate,
} from "@tanstack/react-router";
import { Pin, PinOff } from "lucide-react";
import { LuBot, LuSquareTerminal, LuTrash2 } from "react-icons/lu";
import { usePresetIcon } from "renderer/assets/app-icons/preset-icons";
import { useWorkspaceHostUrl } from "renderer/hooks/host-service/useWorkspaceHostUrl";
import { useHotkeyDisplay } from "renderer/hotkeys";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { navigateToV2Workspace } from "renderer/routes/_authenticated/_dashboard/utils/workspace-navigation";
import {
	getStatusTooltip,
	StatusIndicator,
} from "renderer/screens/main/components/StatusIndicator";
import { useAgentChatPinsStore } from "renderer/stores/agent-chat-pins";
import type { DashboardSidebarAgentChat } from "../../types";
import { useDashboardSidebarAgentKill } from "../DashboardSidebarWorkspaceItem/components/DashboardSidebarWorkspaceDetails/hooks/useDashboardSidebarAgentKill";

interface DashboardSidebarAgentChatItemProps {
	chat: DashboardSidebarAgentChat;
	isCollapsed?: boolean;
	showProjectName?: boolean;
}

export function DashboardSidebarAgentChatItem({
	chat,
	isCollapsed = false,
	showProjectName = false,
}: DashboardSidebarAgentChatItemProps) {
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const activeTerminalId = useLocation({
		select: (location) =>
			(location.search as { terminalId?: string }).terminalId ?? null,
	});
	const iconUrl = usePresetIcon(chat.agentId);
	const pinnedTerminalIds = useAgentChatPinsStore(
		(state) => state.pinnedTerminalIds,
	);
	const togglePinned = useAgentChatPinsStore((state) => state.togglePinned);
	const hostUrl = useWorkspaceHostUrl(chat.workspaceId);
	const { isPending: isKilling, killAgent } = useDashboardSidebarAgentKill(
		chat.workspaceId,
	);
	const isPinned = pinnedTerminalIds.includes(chat.terminalId);
	const isWorkspaceActive = Boolean(
		matchRoute({
			to: "/v2-workspace/$workspaceId",
			params: { workspaceId: chat.workspaceId },
			fuzzy: true,
		}),
	);
	const isActive = isWorkspaceActive && activeTerminalId === chat.terminalId;
	const agentLabel = BUILTIN_AGENT_LABELS[chat.agentId] ?? chat.agentId;
	const statusLabel =
		chat.status === "idle" ? "Idle" : getStatusTooltip(chat.status);
	const pinShortcut = useHotkeyDisplay("TOGGLE_PIN_CHAT").text;
	const locationLabel = showProjectName
		? `${chat.projectName} · ${chat.workspaceName}`
		: chat.workspaceName;

	const handleOpen = () => {
		void (async () => {
			try {
				if (hostUrl) {
					await getHostServiceClientByUrl(
						hostUrl,
					).terminalAgents.resumeIfIdle.mutate({
						workspaceId: chat.workspaceId,
						terminalId: chat.terminalId,
					});
				}
			} catch (error) {
				console.warn("[agent-chat] failed to resume session", {
					terminalId: chat.terminalId,
					error,
				});
			}

			await navigateToV2Workspace(chat.workspaceId, navigate, {
				search: {
					terminalId: chat.terminalId,
					focusRequestId: crypto.randomUUID(),
				},
			});
		})();
	};

	const handleTogglePinned = () => togglePinned(chat.terminalId);
	const handleKill = () => {
		if (!isKilling) void killAgent(chat.terminalId);
	};

	const icon = (
		<span className="relative flex size-5 shrink-0 items-center justify-center">
			{iconUrl ? (
				<img
					src={iconUrl}
					alt=""
					className="size-4 object-contain"
					draggable={false}
				/>
			) : (
				<LuBot className="size-4" />
			)}
			{chat.status !== "idle" && (
				<StatusIndicator
					status={chat.status}
					className="absolute -right-0.5 -bottom-0.5"
				/>
			)}
		</span>
	);

	const collapsedContent = (
		<button
			type="button"
			onClick={handleOpen}
			aria-label={`${chat.title}, ${agentLabel}, ${locationLabel}, ${statusLabel}`}
			className={cn(
				"flex size-8 items-center justify-center rounded-md transition-colors",
				isActive
					? "bg-muted text-foreground"
					: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
			)}
		>
			{icon}
		</button>
	);

	const expandedContent = (
		<div
			className={cn(
				"group/chat relative flex min-h-12 w-full items-center gap-2.5 px-2 py-1.5 pl-5 transition-colors",
				isActive ? "bg-muted" : "hover:bg-muted/50",
			)}
		>
			<button
				type="button"
				onClick={handleOpen}
				aria-label={`${chat.title}, ${agentLabel}, ${locationLabel}, ${statusLabel}`}
				className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none"
			>
				{icon}
				<span className="min-w-0 flex-1">
					<span
						className={cn(
							"block truncate text-[13px] leading-5",
							isActive ? "text-foreground" : "text-foreground/85",
						)}
					>
						{chat.title}
					</span>
					<span className="flex min-w-0 items-center gap-1.5 text-[10px] leading-3.5 text-muted-foreground">
						{showProjectName && (
							<>
								<span className="truncate">{chat.projectName}</span>
								<span aria-hidden="true">·</span>
							</>
						)}
						<span className="truncate">{chat.workspaceName}</span>
						<span aria-hidden="true">·</span>
						<span className="shrink-0">{agentLabel}</span>
					</span>
				</span>
			</button>
			<Tooltip delayDuration={400}>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={handleTogglePinned}
						aria-label={isPinned ? "Unpin agent chat" : "Pin agent chat"}
						className={cn(
							"flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-[color,background-color,opacity] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
							isPinned
								? "opacity-100"
								: "opacity-0 group-hover/chat:opacity-100 group-focus-within/chat:opacity-100",
						)}
					>
						{isPinned ? (
							<PinOff className="size-3.5" />
						) : (
							<Pin className="size-3.5" />
						)}
					</button>
				</TooltipTrigger>
				<TooltipContent side="top">
					{isPinned ? "Unpin chat" : "Pin chat"}
				</TooltipContent>
			</Tooltip>
		</div>
	);

	return (
		<ContextMenu>
			{isCollapsed ? (
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<ContextMenuTrigger asChild>{collapsedContent}</ContextMenuTrigger>
					</TooltipTrigger>
					<TooltipContent side="right" className="max-w-64">
						<p className="truncate font-medium">{chat.title}</p>
						<p className="text-xs text-muted-foreground">
							{agentLabel} · {locationLabel} · {statusLabel}
						</p>
					</TooltipContent>
				</Tooltip>
			) : (
				<ContextMenuTrigger asChild>{expandedContent}</ContextMenuTrigger>
			)}
			<ContextMenuContent onCloseAutoFocus={(event) => event.preventDefault()}>
				<ContextMenuItem onSelect={handleOpen}>
					<LuSquareTerminal />
					Open Chat
				</ContextMenuItem>
				<ContextMenuItem onSelect={handleTogglePinned}>
					{isPinned ? <PinOff /> : <Pin />}
					{isPinned ? "Unpin Chat" : "Pin Chat"}
					{pinShortcut !== "Unassigned" && (
						<ContextMenuShortcut>{pinShortcut}</ContextMenuShortcut>
					)}
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					variant="destructive"
					onSelect={handleKill}
					disabled={isKilling}
				>
					<LuTrash2 />
					Kill Agent
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
