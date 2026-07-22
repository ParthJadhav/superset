import type { HostAgentConfig } from "@superset/host-service/settings";
import {
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@superset/ui/dropdown-menu";
import { Bot } from "lucide-react";
import { BsTerminalPlus } from "react-icons/bs";
import { TbMessageCirclePlus, TbWorld } from "react-icons/tb";
import {
	getPresetIcon,
	useIsDarkTheme,
} from "renderer/assets/app-icons/preset-icons";
import { HotkeyMenuShortcut } from "renderer/components/HotkeyMenuShortcut";

interface AddTabMenuProps {
	agents: HostAgentConfig[];
	onAddAgent: (configId: string) => void | Promise<void>;
	onAddTerminal: () => void;
	onAddChat: () => void;
	onAddBrowser: () => void;
}

export function AddTabMenu({
	agents,
	onAddAgent,
	onAddTerminal,
	onAddChat,
	onAddBrowser,
}: AddTabMenuProps) {
	const isDark = useIsDarkTheme();

	return (
		<>
			<DropdownMenuLabel className="text-[11px] text-muted-foreground">
				Start agent
			</DropdownMenuLabel>
			{agents.map((agent) => {
				const icon = getPresetIcon(agent.iconId ?? agent.presetId, isDark);
				return (
					<DropdownMenuItem
						key={agent.id}
						className="gap-2"
						onSelect={() => void onAddAgent(agent.id)}
					>
						{icon ? (
							<img src={icon} alt="" className="size-4 object-contain" />
						) : (
							<Bot className="size-4" />
						)}
						<span>{agent.label}</span>
					</DropdownMenuItem>
				);
			})}
			{agents.length === 0 && (
				<DropdownMenuItem disabled>No agents configured</DropdownMenuItem>
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
