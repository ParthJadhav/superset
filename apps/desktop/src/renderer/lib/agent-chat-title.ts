import type { WorkspaceState } from "@superset/panes";
import {
	AGENT_IDENTITY_LABELS,
	type AgentIdentityId,
} from "@superset/shared/agent-catalog";

const GENERIC_TERMINAL_TITLES = new Set([
	"chat",
	"local",
	"main",
	"workspace",
	"shell",
	"terminal",
	"zsh",
	"bash",
	"fish",
]);

function normalizeTitle(title: string): string {
	return title.trim().replace(/\s+/g, " ");
}

function isGenericAgentTitle(
	title: string,
	agentId: AgentIdentityId | undefined,
): boolean {
	const normalized = normalizeTitle(title).toLocaleLowerCase();
	if (GENERIC_TERMINAL_TITLES.has(normalized)) return true;
	if (!agentId) return false;

	const label = AGENT_IDENTITY_LABELS[agentId];
	return (
		normalized === agentId.toLocaleLowerCase() ||
		normalized === label?.toLocaleLowerCase() ||
		normalized === `${agentId.toLocaleLowerCase()} session` ||
		normalized === `${label?.toLocaleLowerCase()} session`
	);
}

/**
 * Resolve the concise task/thread name used wherever an agent terminal is
 * represented. Explicit descriptive titles win; generic shell/agent labels
 * fall back to the workspace's generated task summary.
 */
export function resolveAgentChatTitle({
	explicitTitle,
	sessionTitle,
	workspaceName,
	agentId,
}: {
	explicitTitle: string | null | undefined;
	sessionTitle?: string | null;
	workspaceName: string;
	agentId?: AgentIdentityId;
}): string {
	const normalizedExplicitTitle = explicitTitle
		? normalizeTitle(explicitTitle)
		: "";
	const normalizedWorkspaceName = normalizeTitle(workspaceName);
	if (
		normalizedExplicitTitle &&
		normalizedExplicitTitle !== normalizedWorkspaceName &&
		!isGenericAgentTitle(normalizedExplicitTitle, agentId)
	) {
		return normalizedExplicitTitle;
	}

	const normalizedSessionTitle = sessionTitle
		? normalizeTitle(sessionTitle)
		: "";
	if (normalizedSessionTitle) return normalizedSessionTitle;

	if (
		normalizedWorkspaceName &&
		!GENERIC_TERMINAL_TITLES.has(normalizedWorkspaceName.toLocaleLowerCase())
	) {
		return normalizedWorkspaceName;
	}

	return agentId ? `${AGENT_IDENTITY_LABELS[agentId]} session` : "Agent chat";
}

/** Find a persisted tab/pane title for one terminal before resolving it. */
export function findPersistedTerminalTitle(
	layout: WorkspaceState<unknown> | null | undefined,
	terminalId: string,
): string | undefined {
	for (const tab of layout?.tabs ?? []) {
		for (const pane of Object.values(tab.panes)) {
			if (pane.kind !== "terminal") continue;
			const data = pane.data as { terminalId?: unknown };
			if (data.terminalId !== terminalId) continue;
			return tab.titleOverride ?? pane.titleOverride;
		}
	}
	return undefined;
}
