import type { WorkspaceStore } from "@superset/panes";
import { toast } from "@superset/ui/sonner";
import { workspaceTrpc } from "@superset/workspace-client";
import { useCallback } from "react";
import type { StoreApi } from "zustand/vanilla";
import { useWorkspace } from "../../../providers/WorkspaceProvider";
import type { PaneViewerData, TerminalPaneData } from "../../types";

export interface CreateAgentTerminalInput {
	configId: string;
	placement: "split-pane" | "new-tab";
	prompt?: string;
}

export type CreateAgentTerminal = (
	input: CreateAgentTerminalInput,
) => Promise<{ terminalId: string } | null>;

export function useCreateAgentTerminal({
	store,
}: {
	store: StoreApi<WorkspaceStore<PaneViewerData>>;
}): CreateAgentTerminal {
	const { workspace } = useWorkspace();
	const runAgent = workspaceTrpc.agents.run.useMutation();

	return useCallback(
		async (input) => {
			try {
				const result = await runAgent.mutateAsync({
					workspaceId: workspace.id,
					agent: input.configId,
					prompt: input.prompt ?? "",
				});
				if (result.kind !== "terminal") {
					toast.error("Selected agent isn't a terminal agent");
					return null;
				}

				const terminalId = result.sessionId;
				const state = store.getState();
				const pane = {
					kind: "terminal" as const,
					titleOverride: result.label,
					data: { terminalId } as TerminalPaneData,
				};
				if (input.placement === "split-pane" && state.activeTabId) {
					state.addPane({ tabId: state.activeTabId, pane });
				} else {
					state.addTab({ panes: [pane] });
				}
				return { terminalId };
			} catch (error) {
				const description =
					error instanceof Error ? error.message : "Unknown error";
				toast.error("Couldn't start agent session", { description });
				return null;
			}
		},
		[runAgent, store, workspace.id],
	);
}
