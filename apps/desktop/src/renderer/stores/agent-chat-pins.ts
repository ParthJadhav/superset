import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AgentChatPinsState {
	pinnedTerminalIds: string[];
	togglePinned: (terminalId: string) => void;
}

/** Local, device-specific ordering preference for active agent chats. */
export const useAgentChatPinsStore = create<AgentChatPinsState>()(
	devtools(
		persist(
			(set) => ({
				pinnedTerminalIds: [],
				togglePinned: (terminalId) =>
					set((state) => ({
						pinnedTerminalIds: state.pinnedTerminalIds.includes(terminalId)
							? state.pinnedTerminalIds.filter((id) => id !== terminalId)
							: [...state.pinnedTerminalIds, terminalId],
					})),
			}),
			{ name: "agent-chat-pins" },
		),
		{ name: "AgentChatPinsStore" },
	),
);
