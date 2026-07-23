import type { WorkspaceState } from "@superset/panes";
import { useLiveQuery } from "@tanstack/react-db";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";
import {
	getHostProjectIconUrl,
	useHostProjects,
} from "renderer/hooks/host-projects/useHostProjects";
import { deriveTerminalAgentStatus } from "renderer/hooks/host-service/useTerminalAgentStatuses/deriveTerminalAgentStatus";
import { useRelayUrl } from "renderer/hooks/useRelayUrl";
import {
	findPersistedTerminalTitle,
	resolveAgentChatTitle,
} from "renderer/lib/agent-chat-title";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useDashboardSidebarState } from "renderer/routes/_authenticated/hooks/useDashboardSidebarState";
import { useCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider";
import {
	getVisibleSidebarWorkspaces,
	isAutoIncludedLocalMainWorkspace,
} from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal";
import { useHostWorkspaces } from "renderer/routes/_authenticated/providers/HostWorkspacesProvider";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { useV2NotificationStore } from "renderer/stores/v2-notifications";
import { useWorkspaceTransactionsStore } from "renderer/stores/workspace-creates";
import type {
	DashboardSidebarProject,
	DashboardSidebarWorkspace,
} from "../../types";
import { buildDashboardSidebarProjects } from "./buildDashboardSidebarProjects";
import {
	derivePullRequestQueryTargets,
	getDashboardSidebarPullRequestQueryKey,
	type PullRequestQueryTarget,
} from "./derivePullRequestQueryTargets";

const MAIN_WORKSPACE_TAB_ORDER = Number.MIN_SAFE_INTEGER;

type SidebarPullRequest = DashboardSidebarWorkspace["pullRequest"];
type PullRequestWorkspaceRow = {
	workspaceId: string;
	pullRequest: SidebarPullRequest;
};

function haveSameProjects(
	left: DashboardSidebarProject[],
	right: DashboardSidebarProject[],
): boolean {
	return (
		left.length === right.length &&
		left.every((project, index) => project === right[index])
	);
}

function getPullRequestRowsFingerprint(
	rows: PullRequestWorkspaceRow[],
): string {
	return JSON.stringify(
		rows
			.map((row) => [row.workspaceId, row.pullRequest] as const)
			.sort(([leftWorkspaceId], [rightWorkspaceId]) =>
				leftWorkspaceId.localeCompare(rightWorkspaceId),
			),
	);
}

function getDashboardSidebarProjectFingerprint(
	project: DashboardSidebarProject,
): string {
	return JSON.stringify(project);
}

function useStablePullRequestsByWorkspaceId(
	rows: PullRequestWorkspaceRow[] | undefined,
): Map<string, SidebarPullRequest> {
	const previousRef = useRef<{
		fingerprint: string;
		map: Map<string, SidebarPullRequest>;
	} | null>(null);

	return useMemo(() => {
		const nextRows = rows ?? [];
		const fingerprint = getPullRequestRowsFingerprint(nextRows);
		const previous = previousRef.current;
		if (previous?.fingerprint === fingerprint) {
			return previous.map;
		}

		const map = new Map(
			nextRows.map((workspace) => [
				workspace.workspaceId,
				workspace.pullRequest,
			]),
		);
		previousRef.current = { fingerprint, map };
		return map;
	}, [rows]);
}

function useStableDashboardSidebarProjects(
	projects: DashboardSidebarProject[],
): DashboardSidebarProject[] {
	const previousRef = useRef<{
		projects: DashboardSidebarProject[];
		byId: Map<
			string,
			{ fingerprint: string; project: DashboardSidebarProject }
		>;
	} | null>(null);

	return useMemo(() => {
		const previous = previousRef.current;
		const nextById = new Map<
			string,
			{ fingerprint: string; project: DashboardSidebarProject }
		>();
		const nextProjects = projects.map((project) => {
			const fingerprint = getDashboardSidebarProjectFingerprint(project);
			const previousProject = previous?.byId.get(project.id);
			const stableProject =
				previousProject?.fingerprint === fingerprint
					? previousProject.project
					: project;

			nextById.set(project.id, { fingerprint, project: stableProject });
			return stableProject;
		});

		if (previous && haveSameProjects(previous.projects, nextProjects)) {
			previousRef.current = { projects: previous.projects, byId: nextById };
			return previous.projects;
		}

		previousRef.current = { projects: nextProjects, byId: nextById };
		return nextProjects;
	}, [projects]);
}

export function useDashboardSidebarData() {
	const collections = useCollections();
	const { machineId, activeHostUrl } = useLocalHostService();
	const relayUrl = useRelayUrl();
	const { toggleProjectCollapsed } = useDashboardSidebarState();
	const queryClient = useQueryClient();
	const workspaceTransactionsById = useWorkspaceTransactionsStore(
		(state) => state.byWorkspaceId,
	);
	const terminalSeenAt = useV2NotificationStore(
		(state) => state.terminalSeenAt,
	);

	const { data: hosts = [] } = useLiveQuery(
		(q) =>
			q.from({ hosts: collections.v2Hosts }).select(({ hosts }) => ({
				organizationId: hosts.organizationId,
				machineId: hosts.machineId,
				isOnline: hosts.isOnline,
			})),
		[collections],
	);
	const hostsByMachineId = useMemo(
		() => new Map(hosts.map((host) => [host.machineId, host])),
		[hosts],
	);

	// Placement (order/collapse) is local; project identity comes from the
	// host fan-out (useHostProjects) — projects are fully local, so the
	// sidebar joins the two in JS on the project id.
	const { data: sidebarProjectRows = [] } = useLiveQuery(
		(q) =>
			q
				.from({ sidebarProjects: collections.v2SidebarProjects })
				.orderBy(({ sidebarProjects }) => sidebarProjects.tabOrder, "asc")
				.select(({ sidebarProjects }) => ({
					projectId: sidebarProjects.projectId,
					isCollapsed: sidebarProjects.isCollapsed,
				})),
		[collections],
	);

	const { projects: hostProjects } = useHostProjects();

	const sidebarProjects = useMemo(() => {
		const projectsByKey = new Map(
			hostProjects.map((project) => [project.projectKey, project]),
		);
		return sidebarProjectRows.flatMap((row) => {
			const project = projectsByKey.get(row.projectId);
			// No host serves it: stale placement row (deleted project) — drop
			// it, same as the old inner join did.
			if (!project) return [];
			return [
				{
					id: project.projectKey,
					name: project.name,
					githubOwner: project.repoOwner,
					githubRepoName: project.repoName,
					iconUrl: getHostProjectIconUrl(project),
					createdAt: new Date(project.createdAt),
					updatedAt: new Date(project.updatedAt),
					isCollapsed: row.isCollapsed,
				},
			];
		});
	}, [sidebarProjectRows, hostProjects]);

	const { data: sidebarSections = [] } = useLiveQuery(
		(q) =>
			q
				.from({ sidebarSections: collections.v2SidebarSections })
				.orderBy(({ sidebarSections }) => sidebarSections.tabOrder, "asc")
				.select(({ sidebarSections }) => ({
					id: sidebarSections.sectionId,
					projectId: sidebarSections.projectId,
					name: sidebarSections.name,
					createdAt: sidebarSections.createdAt,
					isCollapsed: sidebarSections.isCollapsed,
					tabOrder: sidebarSections.tabOrder,
					color: sidebarSections.color,
				})),
		[collections],
	);

	const { workspaces: hostWorkspaces } = useHostWorkspaces();
	const hostWorkspacesById = useMemo(
		() => new Map(hostWorkspaces.map((workspace) => [workspace.id, workspace])),
		[hostWorkspaces],
	);

	const { data: sidebarLocalStateRows = [] } = useLiveQuery(
		(q) =>
			q
				.from({ sidebarWorkspaces: collections.v2WorkspaceLocalState })
				.orderBy(
					({ sidebarWorkspaces }) => sidebarWorkspaces.sidebarState.tabOrder,
					"asc",
				)
				.select(({ sidebarWorkspaces }) => ({
					workspaceId: sidebarWorkspaces.workspaceId,
					projectId: sidebarWorkspaces.sidebarState.projectId,
					tabOrder: sidebarWorkspaces.sidebarState.tabOrder,
					sectionId: sidebarWorkspaces.sidebarState.sectionId,
					isHidden: sidebarWorkspaces.sidebarState.isHidden,
					paneLayout: sidebarWorkspaces.paneLayout,
				})),
		[collections],
	);
	const paneLayoutsByWorkspaceId = useMemo(
		() =>
			new Map(
				sidebarLocalStateRows.map((row) => [
					row.workspaceId,
					row.paneLayout as WorkspaceState<unknown>,
				]),
			),
		[sidebarLocalStateRows],
	);
	const rawSidebarWorkspaces = useMemo(
		() =>
			sidebarLocalStateRows.flatMap((localState) => {
				const workspace = hostWorkspacesById.get(localState.workspaceId);
				if (!workspace) return [];
				return [
					{
						id: workspace.id,
						projectId: localState.projectId,
						hostId: workspace.hostId,
						type: workspace.type,
						name: workspace.name,
						branch: workspace.branch,
						taskId: workspace.taskId,
						createdAt: workspace.createdAt,
						updatedAt: workspace.updatedAt,
						tabOrder: localState.tabOrder,
						sectionId: localState.sectionId,
						isHidden: localState.isHidden,
						paneLayout: localState.paneLayout,
					},
				];
			}),
		[hostWorkspacesById, sidebarLocalStateRows],
	);
	const rawSidebarWorkspacesWithHostStatus = useMemo(
		() =>
			rawSidebarWorkspaces.map((workspace) => ({
				...workspace,
				hostIsOnline: hostsByMachineId.get(workspace.hostId)?.isOnline ?? false,
				pendingTransaction: workspaceTransactionsById[workspace.id] ?? null,
			})),
		[hostsByMachineId, rawSidebarWorkspaces, workspaceTransactionsById],
	);

	const sidebarWorkspaces = useMemo(
		() => getVisibleSidebarWorkspaces(rawSidebarWorkspacesWithHostStatus),
		[rawSidebarWorkspacesWithHostStatus],
	);

	const localStateWorkspaceIds = useMemo(
		() => new Set(rawSidebarWorkspaces.map((workspace) => workspace.id)),
		[rawSidebarWorkspaces],
	);

	const rawLocalMainWorkspaces = useMemo(
		() =>
			hostWorkspaces
				.filter((workspace) => workspace.type === "main")
				.map((workspace) => ({
					id: workspace.id,
					projectId: workspace.projectId,
					hostId: workspace.hostId,
					type: workspace.type,
					name: workspace.name,
					branch: workspace.branch,
					taskId: workspace.taskId,
					createdAt: workspace.createdAt,
					updatedAt: workspace.updatedAt,
					tabOrder: MAIN_WORKSPACE_TAB_ORDER,
					sectionId: null as string | null,
					paneLayout: paneLayoutsByWorkspaceId.get(workspace.id),
				})),
		[hostWorkspaces, paneLayoutsByWorkspaceId],
	);
	const localMainWorkspaces = useMemo(
		() =>
			rawLocalMainWorkspaces.map((workspace) => ({
				...workspace,
				hostIsOnline: hostsByMachineId.get(workspace.hostId)?.isOnline ?? false,
				pendingTransaction: workspaceTransactionsById[workspace.id] ?? null,
			})),
		[hostsByMachineId, rawLocalMainWorkspaces, workspaceTransactionsById],
	);

	const visibleSidebarWorkspaces = useMemo(() => {
		const sidebarProjectIds = new Set(
			sidebarProjects.map((project) => project.id),
		);
		const autoLocalMainWorkspaces = localMainWorkspaces.filter((workspace) =>
			isAutoIncludedLocalMainWorkspace(workspace, {
				localStateWorkspaceIds,
				sidebarProjectIds,
				machineId,
			}),
		);

		return [...autoLocalMainWorkspaces, ...sidebarWorkspaces];
	}, [
		localMainWorkspaces,
		localStateWorkspaceIds,
		machineId,
		sidebarProjects,
		sidebarWorkspaces,
	]);

	const pullRequestQueryTargets = useMemo<PullRequestQueryTarget[]>(
		() =>
			derivePullRequestQueryTargets({
				activeHostUrl,
				hosts,
				machineId,
				relayUrl,
				workspaces: visibleSidebarWorkspaces,
			}),
		[activeHostUrl, hosts, machineId, relayUrl, visibleSidebarWorkspaces],
	);
	const hostUrlByMachineId = useMemo(
		() =>
			new Map(
				pullRequestQueryTargets.map((target) => [
					target.machineId,
					target.hostUrl,
				]),
			),
		[pullRequestQueryTargets],
	);

	const terminalAgentQueries = useQueries({
		queries: visibleSidebarWorkspaces.map((workspace) => {
			const hostUrl = hostUrlByMachineId.get(workspace.hostId) ?? null;
			return {
				queryKey: ["terminal-agent-bindings", hostUrl, workspace.id] as const,
				enabled: hostUrl !== null,
				queryFn: () =>
					hostUrl
						? getHostServiceClientByUrl(
								hostUrl,
							).terminalAgents.listByWorkspace.query({
								workspaceId: workspace.id,
							})
						: Promise.resolve([]),
				refetchInterval: 5_000,
				refetchOnWindowFocus: true,
				staleTime: 5_000,
			};
		}),
	});

	const pullRequestQueries = useQueries({
		queries: pullRequestQueryTargets.map((target) => ({
			queryKey: getDashboardSidebarPullRequestQueryKey(target),
			refetchInterval: 10_000,
			queryFn: async () => {
				const client = getHostServiceClientByUrl(target.hostUrl);
				return client.pullRequests.getByWorkspaces.query({
					workspaceIds: target.workspaceIds,
				});
			},
		})),
	});

	const pullRequestRows = useMemo<PullRequestWorkspaceRow[]>(() => {
		const rows: PullRequestWorkspaceRow[] = [];
		for (const query of pullRequestQueries) {
			const data = query.data;
			if (!data) continue;
			for (const row of data.workspaces) {
				rows.push({
					workspaceId: row.workspaceId,
					pullRequest: row.pullRequest,
				});
			}
		}
		return rows;
	}, [pullRequestQueries]);

	const refreshWorkspacePullRequest = useCallback(
		async (workspaceId: string) => {
			const workspace = visibleSidebarWorkspaces.find(
				(candidate) => candidate.id === workspaceId,
			);
			if (!workspace) return;
			const target = pullRequestQueryTargets.find(
				(candidate) => candidate.machineId === workspace.hostId,
			);
			if (!target) return;

			const client = getHostServiceClientByUrl(target.hostUrl);
			await client.pullRequests.refreshByWorkspaces.mutate({
				workspaceIds: [workspaceId],
			});
			await queryClient.invalidateQueries({
				queryKey: getDashboardSidebarPullRequestQueryKey(target),
			});
		},
		[pullRequestQueryTargets, queryClient, visibleSidebarWorkspaces],
	);

	const pullRequestsByWorkspaceId =
		useStablePullRequestsByWorkspaceId(pullRequestRows);

	const computedGroups = useMemo<DashboardSidebarProject[]>(() => {
		const projects = buildDashboardSidebarProjects({
			sidebarProjects,
			sidebarSections,
			visibleSidebarWorkspaces,
			machineId,
			pullRequestsByWorkspaceId,
		});
		const bindingsByWorkspaceId = new Map(
			visibleSidebarWorkspaces.map((workspace, index) => [
				workspace.id,
				terminalAgentQueries[index]?.data ?? [],
			]),
		);
		const layoutsByWorkspaceId = new Map(
			visibleSidebarWorkspaces.map((workspace) => [
				workspace.id,
				workspace.paneLayout as WorkspaceState<unknown> | undefined,
			]),
		);

		for (const project of projects) {
			const workspaces = project.children.flatMap((child) =>
				child.type === "workspace"
					? [child.workspace]
					: child.section.workspaces,
			);
			project.agentChats = workspaces
				.flatMap((workspace) =>
					(bindingsByWorkspaceId.get(workspace.id) ?? []).map((binding) => ({
						terminalId: binding.terminalId,
						workspaceId: workspace.id,
						workspaceName: workspace.name,
						projectId: project.id,
						projectName: project.name,
						agentId: binding.agentId,
						status: deriveTerminalAgentStatus({
							lastEventType: binding.lastEventType,
							lastEventAt: binding.lastEventAt,
							lastSeenAt: terminalSeenAt[binding.terminalId],
						}),
						title: resolveAgentChatTitle({
							explicitTitle: findPersistedTerminalTitle(
								layoutsByWorkspaceId.get(workspace.id),
								binding.terminalId,
							),
							sessionTitle: binding.sessionTitle,
							workspaceName: workspace.name,
							agentId: binding.agentId,
						}),
						startedAt: binding.startedAt,
						lastEventAt: binding.lastEventAt,
					})),
				)
				.sort((left, right) => right.lastEventAt - left.lastEventAt);
		}

		return projects;
	}, [
		machineId,
		pullRequestsByWorkspaceId,
		sidebarProjects,
		sidebarSections,
		terminalAgentQueries,
		terminalSeenAt,
		visibleSidebarWorkspaces,
	]);
	const groups = useStableDashboardSidebarProjects(computedGroups);

	return {
		groups,
		refreshWorkspacePullRequest,
		toggleProjectCollapsed,
	};
}
