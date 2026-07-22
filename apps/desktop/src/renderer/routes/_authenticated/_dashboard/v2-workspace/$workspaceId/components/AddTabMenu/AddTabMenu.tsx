import type { HostAgentConfig } from "@superset/host-service/settings";
import {
	DropdownMenuCheckboxItem,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
} from "@superset/ui/dropdown-menu";
import { Bot, Check, Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BsTerminalPlus } from "react-icons/bs";
import { TbMessageCirclePlus, TbWorld } from "react-icons/tb";
import {
	getPresetIcon,
	useIsDarkTheme,
} from "renderer/assets/app-icons/preset-icons";
import { HotkeyMenuShortcut } from "renderer/components/HotkeyMenuShortcut";
import {
	getHarnessNumberShortcutIndex,
	MAX_HARNESS_NUMBER_SHORTCUTS,
	readHiddenHarnessIds,
	writeHiddenHarnessIds,
} from "./utils/harnessPicker";

interface AddTabMenuProps {
	agents: HostAgentConfig[];
	onRequestClose: () => void;
	onAddAgent: (configId: string) => void | Promise<void>;
	onAddTerminal: () => void;
	onAddChat: () => void;
	onAddBrowser: () => void;
}

export function AddTabMenu({
	agents,
	onRequestClose,
	onAddAgent,
	onAddTerminal,
	onAddChat,
	onAddBrowser,
}: AddTabMenuProps) {
	const isDark = useIsDarkTheme();
	const [isEditing, setIsEditing] = useState(false);
	const [hiddenAgentIds, setHiddenAgentIds] = useState(readHiddenHarnessIds);
	const visibleAgents = useMemo(
		() => agents.filter((agent) => !hiddenAgentIds.has(agent.id)),
		[agents, hiddenAgentIds],
	);

	const launchAgent = useCallback(
		(agentId: string) => {
			onRequestClose();
			void onAddAgent(agentId);
		},
		[onAddAgent, onRequestClose],
	);

	const setAgentVisible = useCallback((agentId: string, visible: boolean) => {
		setHiddenAgentIds((current) => {
			const next = new Set(current);
			if (visible) next.delete(agentId);
			else next.add(agentId);
			writeHiddenHarnessIds(next);
			return next;
		});
	}, []);

	useEffect(() => {
		if (isEditing) return;
		const handleNumberShortcut = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.repeat ||
				event.metaKey ||
				event.ctrlKey ||
				event.altKey ||
				event.shiftKey
			) {
				return;
			}
			const index = getHarnessNumberShortcutIndex(event.key);
			if (index === null) return;
			const agent = visibleAgents[index];
			if (!agent) return;

			event.preventDefault();
			event.stopPropagation();
			launchAgent(agent.id);
		};
		window.addEventListener("keydown", handleNumberShortcut, true);
		return () =>
			window.removeEventListener("keydown", handleNumberShortcut, true);
	}, [isEditing, launchAgent, visibleAgents]);

	return (
		<>
			<DropdownMenuLabel className="flex items-center justify-between gap-2 py-1 text-[11px] text-muted-foreground">
				<span>{isEditing ? "Show in picker" : "Start agent"}</span>
				<button
					type="button"
					aria-label={isEditing ? "Finish editing harnesses" : "Edit harnesses"}
					aria-pressed={isEditing}
					title={isEditing ? "Done" : "Edit harnesses"}
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => {
						event.stopPropagation();
						setIsEditing((current) => !current);
					}}
					className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{isEditing ? (
						<Check className="size-3.5" />
					) : (
						<Pencil className="size-3.5" />
					)}
				</button>
			</DropdownMenuLabel>
			{isEditing &&
				agents.map((agent) => {
					const icon = getPresetIcon(agent.iconId ?? agent.presetId, isDark);
					return (
						<DropdownMenuCheckboxItem
							key={agent.id}
							checked={!hiddenAgentIds.has(agent.id)}
							onCheckedChange={(checked) =>
								setAgentVisible(agent.id, checked === true)
							}
							onSelect={(event) => event.preventDefault()}
							className="gap-2"
						>
							{icon ? (
								<img src={icon} alt="" className="size-4 object-contain" />
							) : (
								<Bot className="size-4" />
							)}
							<span className="truncate">{agent.label}</span>
						</DropdownMenuCheckboxItem>
					);
				})}
			{!isEditing &&
				visibleAgents.map((agent, index) => {
					const icon = getPresetIcon(agent.iconId ?? agent.presetId, isDark);
					return (
						<DropdownMenuItem
							key={agent.id}
							className="gap-2"
							onSelect={() => launchAgent(agent.id)}
						>
							{icon ? (
								<img src={icon} alt="" className="size-4 object-contain" />
							) : (
								<Bot className="size-4" />
							)}
							<span>{agent.label}</span>
							{index < MAX_HARNESS_NUMBER_SHORTCUTS && (
								<DropdownMenuShortcut className="tabular-nums tracking-normal">
									{index + 1}
								</DropdownMenuShortcut>
							)}
						</DropdownMenuItem>
					);
				})}
			{agents.length === 0 && (
				<DropdownMenuItem disabled>No agents configured</DropdownMenuItem>
			)}
			{!isEditing && agents.length > 0 && visibleAgents.length === 0 && (
				<DropdownMenuItem disabled>No harnesses shown</DropdownMenuItem>
			)}
			<DropdownMenuSeparator />
			<DropdownMenuItem className="gap-2" onClick={onAddTerminal}>
				<BsTerminalPlus className="size-4" />
				<span>Plain Terminal</span>
				<HotkeyMenuShortcut hotkeyId="NEW_GROUP" />
			</DropdownMenuItem>
			<DropdownMenuItem className="gap-2" onClick={onAddChat}>
				<TbMessageCirclePlus className="size-4" />
				<span>Superset Chat</span>
				<HotkeyMenuShortcut hotkeyId="NEW_CHAT" />
			</DropdownMenuItem>
			<DropdownMenuItem className="gap-2" onClick={onAddBrowser}>
				<TbWorld className="size-4" />
				<span>Browser</span>
				<HotkeyMenuShortcut hotkeyId="NEW_BROWSER" />
			</DropdownMenuItem>
		</>
	);
}
