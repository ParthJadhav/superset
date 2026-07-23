import { toast } from "@superset/ui/sonner";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useRef } from "react";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useHostWorkspaces } from "renderer/routes/_authenticated/providers/HostWorkspacesProvider";
import type { NewWorkspacePromptContextApi } from "renderer/stores/new-workspace-prompt-context";
import { useDashboardNewWorkspaceDraft } from "../../../../../DashboardNewWorkspaceDraftContext";
import type { WorkspaceCreateAgent } from "../../types";
import type { UseUploadAttachmentsApi } from "../useUploadAttachments";

interface UseSubmitToMainWorkspaceOptions {
	projectId: string | null;
	hostId: string | null;
	hostUrl: string | null;
	selectedAgent: WorkspaceCreateAgent;
	selectedModel: string | null;
	selectedEffort: string | null;
	uploadAttachments: UseUploadAttachmentsApi;
	promptContext: NewWorkspacePromptContextApi;
}

/**
 * Starts the selected agent in the project's existing main workspace.
 * Unlike useSubmitWorkspace, this path never creates a branch or worktree.
 */
export function useSubmitToMainWorkspace({
	projectId,
	hostId,
	hostUrl,
	selectedAgent,
	selectedModel,
	selectedEffort,
	uploadAttachments,
	promptContext,
}: UseSubmitToMainWorkspaceOptions) {
	const navigate = useNavigate();
	const { workspaces } = useHostWorkspaces();
	const { closeAndResetDraft, draft } = useDashboardNewWorkspaceDraft();
	const isSubmittingRef = useRef(false);

	return useCallback(async () => {
		if (isSubmittingRef.current) return;
		if (!projectId) {
			toast.error("Select a project first");
			return;
		}
		if (!hostId || !hostUrl) {
			toast.error("The selected host is unavailable");
			return;
		}
		if (selectedAgent === "none") {
			toast.error("Select an agent to send the prompt");
			return;
		}

		let mainWorkspaceId = workspaces.find(
			(workspace) =>
				workspace.projectId === projectId &&
				workspace.hostId === hostId &&
				workspace.type === "main",
		)?.id;

		isSubmittingRef.current = true;
		try {
			const client = getHostServiceClientByUrl(hostUrl);
			if (!mainWorkspaceId) {
				const latestWorkspaces = await client.workspace.list.query();
				mainWorkspaceId = latestWorkspaces.find(
					(workspace) =>
						workspace.projectId === projectId && workspace.type === "main",
				)?.id;
			}
			if (!mainWorkspaceId) {
				toast.error("Set up this project before sending a prompt");
				return;
			}

			const { readyIds: attachmentIds, errors } =
				await uploadAttachments.awaitUploads();
			if (errors.length > 0) {
				const first = errors[0];
				toast.error(
					first.filename
						? `Attachment upload failed (${first.filename}): ${first.message}`
						: `Attachment upload failed: ${first.message}`,
				);
				return;
			}

			const prompt = await promptContext.build({
				userPrompt: draft.prompt,
				linkedPR: draft.linkedPR,
				linkedIssues: draft.linkedIssues,
				timeoutMs: 2000,
			});
			const result = await client.agents.run.mutate({
				workspaceId: mainWorkspaceId,
				agent: selectedAgent,
				prompt,
				attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
				model: selectedModel ?? undefined,
				effort: selectedEffort ?? undefined,
			});

			closeAndResetDraft();
			await navigate({
				to: "/v2-workspace/$workspaceId",
				params: { workspaceId: mainWorkspaceId },
				search:
					result.kind === "terminal"
						? {
								terminalId: result.sessionId,
								focusRequestId: crypto.randomUUID(),
							}
						: {
								chatSessionId: result.sessionId,
								focusRequestId: crypto.randomUUID(),
							},
			});
		} catch (error) {
			console.error("[useSubmitToMainWorkspace] failed to send prompt", error);
			toast.error("Couldn't send the prompt", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			isSubmittingRef.current = false;
		}
	}, [
		closeAndResetDraft,
		draft,
		hostId,
		hostUrl,
		navigate,
		projectId,
		promptContext,
		selectedAgent,
		selectedEffort,
		selectedModel,
		uploadAttachments,
		workspaces,
	]);
}
