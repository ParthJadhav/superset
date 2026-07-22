import type { Tab } from "@superset/panes";
import { renderBrowserTabIcon } from "../../hooks/usePaneRegistry/components/BrowserPane";
import { TerminalPaneIcon } from "../../hooks/usePaneRegistry/components/TerminalPane/components/TerminalPaneIcon";
import type { PaneViewerData, TerminalPaneData } from "../../types";

interface WorkspaceTabIconProps {
	tab: Tab<PaneViewerData>;
	workspaceId: string;
}

export function WorkspaceTabIcon({ tab, workspaceId }: WorkspaceTabIconProps) {
	const paneIds = Object.keys(tab.panes);
	const titlePane =
		paneIds.length === 1
			? tab.panes[paneIds[0]]
			: tab.activePaneId
				? tab.panes[tab.activePaneId]
				: undefined;

	if (titlePane?.kind === "terminal") {
		const { terminalId } = titlePane.data as TerminalPaneData;
		return (
			<TerminalPaneIcon workspaceId={workspaceId} terminalId={terminalId} />
		);
	}

	return renderBrowserTabIcon(tab);
}
