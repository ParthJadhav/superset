import { Button } from "@superset/ui/button";
import { toast } from "@superset/ui/sonner";
import { useMemo, useState } from "react";
import { LuLoaderCircle, LuScanSearch, LuTrash2 } from "react-icons/lu";
import { AgentSelect } from "renderer/components/AgentSelect";
import { useAgentLaunchPreferences } from "renderer/hooks/useAgentLaunchPreferences";
import { useV2AgentConfigs } from "renderer/hooks/useV2AgentConfigs";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { ProjectThumbnail } from "renderer/routes/_authenticated/components/ProjectThumbnail";
import { getCompatibleLogoAgents } from "./ProjectLogoField.utils";

const AGENT_STORAGE_KEY = "lastSelectedProjectLogoAgent";

type ResultState =
	| { kind: "idle" }
	| { kind: "success"; message: string }
	| { kind: "no-match"; message: string }
	| { kind: "error"; message: string };

interface ProjectLogoFieldProps {
	projectId: string;
	projectName: string;
	hostId: string;
	hostUrl: string | null;
	iconDataUrl: string | null;
	fallbackIconUrl: string | null;
	onChanged: () => undefined | Promise<unknown>;
}

export function ProjectLogoField({
	projectId,
	projectName,
	hostId,
	hostUrl,
	iconDataUrl,
	fallbackIconUrl,
	onChanged,
}: ProjectLogoFieldProps) {
	const configsQuery = useV2AgentConfigs(hostUrl);
	const agents = useMemo(
		() => getCompatibleLogoAgents(configsQuery.data ?? []),
		[configsQuery.data],
	);
	const validAgentIds = useMemo(
		() => agents.map((agent) => agent.id),
		[agents],
	);
	const { selectedAgent, setSelectedAgent } = useAgentLaunchPreferences({
		agentStorageKey: `${AGENT_STORAGE_KEY}:${hostId}`,
		defaultAgent: "",
		fallbackAgent: validAgentIds[0] ?? "",
		validAgents: validAgentIds,
		agentsReady: configsQuery.isFetched,
	});
	const [pendingAction, setPendingAction] = useState<
		"derive" | "remove" | null
	>(null);
	const [result, setResult] = useState<ResultState>({ kind: "idle" });

	const isPending = pendingAction !== null;
	const canDerive =
		Boolean(hostUrl) &&
		configsQuery.isFetched &&
		!configsQuery.isError &&
		agents.length > 0 &&
		selectedAgent !== "" &&
		!isPending;

	const handleDerive = async () => {
		if (!hostUrl || !canDerive) return;
		setPendingAction("derive");
		setResult({ kind: "idle" });
		try {
			const derived = await getHostServiceClientByUrl(
				hostUrl,
			).project.deriveLogo.mutate({
				projectId,
				agent: selectedAgent,
			});
			if (derived.status === "no_match") {
				const message = "No credible project logo was found.";
				setResult({ kind: "no-match", message });
				toast.info(message);
				return;
			}

			const message = `Applied ${derived.sourcePath}`;
			setResult({ kind: "success", message });
			toast.success("Project logo updated");
			await onChanged();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to find a project logo";
			setResult({ kind: "error", message });
			toast.error(message);
		} finally {
			setPendingAction(null);
		}
	};

	const handleRemove = async () => {
		if (!hostUrl || isPending) return;
		setPendingAction("remove");
		setResult({ kind: "idle" });
		try {
			await getHostServiceClientByUrl(hostUrl).project.removeLogo.mutate({
				projectId,
			});
			setResult({
				kind: "success",
				message: "Using the default project icon.",
			});
			toast.success("Project logo removed");
			await onChanged();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to remove project logo";
			setResult({ kind: "error", message });
			toast.error(message);
		} finally {
			setPendingAction(null);
		}
	};

	let status: ResultState = result;
	if (!hostUrl) {
		status = { kind: "error", message: "This project host is offline." };
	} else if (!configsQuery.isFetched) {
		status = { kind: "idle" };
	} else if (configsQuery.isError) {
		status = {
			kind: "error",
			message: "Could not load agents from this project host.",
		};
	} else if (agents.length === 0) {
		status = {
			kind: "error",
			message: "No configured agent supports read-only logo discovery.",
		};
	}

	return (
		<div className="flex flex-col items-end gap-1.5">
			<div className="flex flex-wrap items-center justify-end gap-2">
				<ProjectThumbnail
					projectName={projectName}
					iconUrl={iconDataUrl ?? fallbackIconUrl}
					className="size-9 rounded-md"
				/>
				<AgentSelect
					agents={agents}
					value={selectedAgent}
					placeholder={
						configsQuery.isFetched ? "Choose agent" : "Loading agents…"
					}
					onValueChange={(value) => {
						setSelectedAgent(value);
						setResult({ kind: "idle" });
					}}
					disabled={!hostUrl || !configsQuery.isFetched || isPending}
					triggerClassName="h-8 w-40"
					contentClassName="w-52"
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void handleDerive()}
					disabled={!canDerive}
				>
					{pendingAction === "derive" ? (
						<LuLoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
					) : (
						<LuScanSearch className="size-4" />
					)}
					{pendingAction === "derive" ? "Finding…" : "Find logo"}
				</Button>
				{iconDataUrl ? (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={() => void handleRemove()}
						disabled={!hostUrl || isPending}
						aria-label="Remove derived project logo"
						title="Remove derived project logo"
					>
						{pendingAction === "remove" ? (
							<LuLoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
						) : (
							<LuTrash2 className="size-4" />
						)}
					</Button>
				) : null}
			</div>
			{pendingAction === "derive" ? (
				<output
					className="block max-w-md text-right text-xs text-muted-foreground"
					aria-live="polite"
				>
					The agent is inspecting this project without modifying files.
				</output>
			) : status.kind !== "idle" ? (
				<output
					className={
						status.kind === "error"
							? "block max-w-md text-right text-xs text-destructive select-text cursor-text"
							: "block max-w-md text-right text-xs text-muted-foreground"
					}
					aria-live="polite"
				>
					{status.message}
				</output>
			) : null}
		</div>
	);
}
