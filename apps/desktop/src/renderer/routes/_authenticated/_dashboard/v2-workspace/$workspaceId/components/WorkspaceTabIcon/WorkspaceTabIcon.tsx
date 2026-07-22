import { type PaneRegistry, pickTabTitlePane, type Tab } from "@superset/panes";
import { renderBrowserTabIcon } from "../../hooks/usePaneRegistry/components/BrowserPane";
import { TerminalPaneIcon } from "../../hooks/usePaneRegistry/components/TerminalPane/components/TerminalPaneIcon";
import type { PaneViewerData, TerminalPaneData } from "../../types";

interface WorkspaceTabIconProps {
	tab: Tab<PaneViewerData>;
	registry: PaneRegistry<PaneViewerData>;
	workspaceId: string;
}

export function WorkspaceTabIcon({
	tab,
	registry,
	workspaceId,
}: WorkspaceTabIconProps) {
	const titlePane = pickTabTitlePane(tab, registry);

	if (titlePane?.kind === "terminal") {
		const { terminalId } = titlePane.data as TerminalPaneData;
		return (
			<TerminalPaneIcon workspaceId={workspaceId} terminalId={terminalId} />
		);
	}

	return renderBrowserTabIcon(tab, titlePane);
}
