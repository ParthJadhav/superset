import type { Pane, Tab } from "../../../../types";
import type { PaneRegistry } from "../../../types";

/**
 * The pane that drives the tab title: the only pane in a single-pane tab, or
 * the active eligible pane in a multi-pane tab. If the active pane opts out of
 * tab-title ownership, the first eligible pane keeps the tab identity stable.
 */
export function pickTabTitlePane<TData>(
	tab: Tab<TData>,
	registry: PaneRegistry<TData>,
): Pane<TData> | undefined {
	const allPanes = Object.values(tab.panes);
	if (allPanes.length === 1) return allPanes[0];

	const panes = allPanes.filter(
		(pane) => registry[pane.kind]?.canDriveTabTitle?.(pane) !== false,
	);
	if (panes.length === 1) return panes[0];
	if (panes.length > 1 && tab.activePaneId) {
		const activePane = tab.panes[tab.activePaneId];
		if (!activePane) return undefined;
		if (registry[activePane.kind]?.canDriveTabTitle?.(activePane) !== false) {
			return activePane;
		}
		return panes[0];
	}
	return undefined;
}

function paneTitle<TData>(
	pane: Pane<TData> | undefined,
	registry: PaneRegistry<TData>,
): string | undefined {
	if (!pane) return undefined;
	return pane.titleOverride ?? registry[pane.kind]?.getTitle?.(pane);
}

export function resolveTabTitle<TData>(
	tab: Tab<TData>,
	tabs: Tab<TData>[],
	registry: PaneRegistry<TData>,
): string {
	if (tab.titleOverride) return tab.titleOverride;
	const fromPane = paneTitle(pickTabTitlePane(tab, registry), registry);
	if (fromPane) return fromPane;
	return `Tab ${tabs.indexOf(tab) + 1}`;
}
