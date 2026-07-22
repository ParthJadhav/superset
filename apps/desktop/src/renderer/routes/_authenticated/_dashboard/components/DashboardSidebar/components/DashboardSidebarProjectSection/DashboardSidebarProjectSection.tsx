import type {
	DraggableAttributes,
	DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { cn } from "@superset/ui/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { DashboardSidebarProject } from "../../types";
import { getProjectChildrenWorkspaces } from "../../utils/projectChildren";
import { DashboardSidebarCollapsedProjectContent } from "./components/DashboardSidebarCollapsedProjectContent";
import { DashboardSidebarExpandedProjectContent } from "./components/DashboardSidebarExpandedProjectContent";
import { DashboardSidebarProjectContextMenu } from "./components/DashboardSidebarProjectContextMenu";
import { DashboardSidebarProjectRow } from "./components/DashboardSidebarProjectRow";
import { useDashboardSidebarProjectSectionActions } from "./hooks/useDashboardSidebarProjectSectionActions";

interface DashboardSidebarProjectSectionProps {
	project: DashboardSidebarProject;
	isSidebarCollapsed?: boolean;
	isDraggingProject?: boolean;
	workspaceShortcutLabels: Map<string, string>;
	onWorkspaceHover: (workspaceId: string) => void | Promise<void>;
	onToggleCollapse: (projectId: string) => void;
	dragHandleListeners?: DraggableSyntheticListeners;
	dragHandleAttributes?: DraggableAttributes;
}

export function DashboardSidebarProjectSection({
	project,
	isSidebarCollapsed = false,
	isDraggingProject = false,
	workspaceShortcutLabels,
	onWorkspaceHover,
	onToggleCollapse,
	dragHandleListeners,
	dragHandleAttributes,
}: DashboardSidebarProjectSectionProps) {
	const flattenedCollapsedWorkspaces = useMemo(
		() => getProjectChildrenWorkspaces(project.children),
		[project.children],
	);

	const {
		cancelRename,
		confirmRemoveFromSidebar,
		handleNewWorkspace,
		handleOpenInFinder,
		handleOpenSettings,
		isRenaming,
		renameValue,
		setRenameValue,
		startRename,
		submitRename,
	} = useDashboardSidebarProjectSectionActions({
		project,
	});

	const totalItemCount =
		project.agentChats.length || flattenedCollapsedWorkspaces.length;

	if (isSidebarCollapsed) {
		return (
			<DashboardSidebarProjectContextMenu
				onOpenInFinder={handleOpenInFinder}
				onOpenSettings={handleOpenSettings}
				onRemoveFromSidebar={confirmRemoveFromSidebar}
				onRename={startRename}
			>
				<div className={cn("border-b border-border last:border-b-0")}>
					<DashboardSidebarCollapsedProjectContent
						projectName={project.name}
						iconUrl={project.iconUrl}
						isCollapsed={project.isCollapsed}
						totalItemCount={totalItemCount}
						agentChats={project.agentChats}
						workspaces={flattenedCollapsedWorkspaces}
						workspaceShortcutLabels={workspaceShortcutLabels}
						onWorkspaceHover={onWorkspaceHover}
						onToggleCollapse={() => onToggleCollapse(project.id)}
					/>
				</div>
			</DashboardSidebarProjectContextMenu>
		);
	}

	return (
		<div className={cn("border-b border-border last:border-b-0")}>
			<DashboardSidebarProjectContextMenu
				onOpenInFinder={handleOpenInFinder}
				onOpenSettings={handleOpenSettings}
				onRemoveFromSidebar={confirmRemoveFromSidebar}
				onRename={startRename}
			>
				<DashboardSidebarProjectRow
					projectName={project.name}
					iconUrl={project.iconUrl}
					isCollapsed={project.isCollapsed}
					isRenaming={isRenaming}
					renameValue={renameValue}
					onRenameValueChange={setRenameValue}
					onSubmitRename={submitRename}
					onCancelRename={cancelRename}
					onStartRename={startRename}
					onToggleCollapse={() => onToggleCollapse(project.id)}
					onNewWorkspace={handleNewWorkspace}
					{...(dragHandleAttributes ?? {})}
					{...(dragHandleListeners ?? {})}
				/>
			</DashboardSidebarProjectContextMenu>

			<AnimatePresence initial={false}>
				{!isDraggingProject && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
						className="overflow-hidden"
					>
						<DashboardSidebarExpandedProjectContent
							isCollapsed={project.isCollapsed}
							projectChildren={project.children}
							agentChats={project.agentChats}
							workspaceShortcutLabels={workspaceShortcutLabels}
							onWorkspaceHover={onWorkspaceHover}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
