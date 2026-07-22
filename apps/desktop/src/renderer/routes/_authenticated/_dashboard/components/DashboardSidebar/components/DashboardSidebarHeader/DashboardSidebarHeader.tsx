import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { toast } from "@superset/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { useNavigate } from "@tanstack/react-router";
import { HiMiniPlus } from "react-icons/hi2";
import { LuFolderInput, LuFolderPlus, LuLayoutTemplate } from "react-icons/lu";
import { ZoomStable } from "renderer/components/ZoomStable";
import { useZoomFactor } from "renderer/hooks/useZoomFactor";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { useFolderFirstImport } from "renderer/routes/_authenticated/_dashboard/components/AddRepositoryModals/hooks/useFolderFirstImport";
import { NavigationControls } from "renderer/routes/_authenticated/_dashboard/components/NavigationControls";
import { SidebarToggle } from "renderer/routes/_authenticated/_dashboard/components/SidebarToggle";
import { AutomationsButton } from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/AutomationsButton";
import { ResourceConsumption } from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/ResourceConsumption";
import {
	useOpenNewProjectModal,
	useOpenTemplateGalleryModal,
} from "renderer/stores/add-repository-modal";

interface DashboardSidebarHeaderProps {
	isCollapsed?: boolean;
}

export function DashboardSidebarHeader({
	isCollapsed = false,
}: DashboardSidebarHeaderProps) {
	const openNewProject = useOpenNewProjectModal();
	const openTemplateGallery = useOpenTemplateGalleryModal();
	const navigate = useNavigate();
	const folderImport = useFolderFirstImport({
		onError: (message) => {
			toast.error(`Import failed: ${message}`);
		},
		onMultipleProjects: ({ candidates }) => {
			toast.error("Import failed", {
				description: `Multiple projects use this repository (${candidates.length}). Choose the project in settings to set it up on this device.`,
				action: {
					label: "Open Projects",
					onClick: () => navigate({ to: "/settings/projects" }),
				},
			});
		},
	});

	const handleImportFolder = async () => {
		const result = await folderImport.start();
		if (result) {
			toast.success("Project ready — open it from the sidebar.");
		}
	};

	const { data: platform } = electronTrpc.window.getPlatform.useQuery();
	const isMac = platform === undefined || platform === "darwin";
	const zoomFactor = useZoomFactor();

	if (isCollapsed) {
		return (
			<div className="flex flex-col items-center gap-2 py-2">
				<DropdownMenu>
					<Tooltip delayDuration={300}>
						<TooltipTrigger asChild>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									aria-label="Add repository"
									className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
								>
									<LuFolderPlus className="size-4" />
								</button>
							</DropdownMenuTrigger>
						</TooltipTrigger>
						<TooltipContent side="right">Add repository</TooltipContent>
					</Tooltip>
					<DropdownMenuContent
						align="start"
						onCloseAutoFocus={(event) => event.preventDefault()}
					>
						<DropdownMenuItem onSelect={() => openNewProject()}>
							<HiMiniPlus className="size-4" />
							Clone from URL
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={handleImportFolder}>
							<LuFolderInput className="size-4" />
							Open from folder
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => openTemplateGallery()}>
							<LuLayoutTemplate className="size-4" />
							Start from a template
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	}

	return (
		<div
			className="px-3 pt-2 pb-2"
			style={isMac ? { paddingTop: `${8 / zoomFactor}px` } : undefined}
		>
			<div
				className="drag -mx-3 flex h-8 items-center pr-3"
				style={
					isMac
						? {
								paddingLeft: `${80 / zoomFactor}px`,
								height: `${32 / zoomFactor}px`,
							}
						: { paddingLeft: "8px" }
				}
			>
				<ZoomStable enabled={isMac} className="flex items-center gap-1.5">
					<SidebarToggle />
					<NavigationControls />
					<div className="flex items-center gap-0.5">
						<ResourceConsumption surface="v2" />
						<AutomationsButton />
					</div>
				</ZoomStable>
			</div>
		</div>
	);
}
