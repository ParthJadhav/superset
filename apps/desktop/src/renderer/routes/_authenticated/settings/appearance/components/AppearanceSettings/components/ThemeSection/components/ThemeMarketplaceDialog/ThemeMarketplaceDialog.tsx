import { Badge } from "@superset/ui/badge";
import { Button } from "@superset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@superset/ui/dialog";
import { Input } from "@superset/ui/input";
import { Skeleton } from "@superset/ui/skeleton";
import { toast } from "@superset/ui/sonner";
import { useEffect, useState } from "react";
import {
	HiMiniCheckBadge,
	HiOutlineArrowPath,
	HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { useSetTheme, useThemeStore } from "renderer/stores";

interface ThemeMarketplaceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const compactNumberFormatter = new Intl.NumberFormat(undefined, {
	notation: "compact",
	maximumFractionDigits: 1,
});
const themeResultSkeletonIds = [
	"theme-skeleton-a",
	"theme-skeleton-b",
	"theme-skeleton-c",
	"theme-skeleton-d",
	"theme-skeleton-e",
	"theme-skeleton-f",
];

export function ThemeMarketplaceDialog({
	open,
	onOpenChange,
}: ThemeMarketplaceDialogProps) {
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [installingId, setInstallingId] = useState<string | null>(null);
	const upsertCustomThemes = useThemeStore((state) => state.upsertCustomThemes);
	const setTheme = useSetTheme();

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedQuery(query.trim());
		}, 250);
		return () => window.clearTimeout(timeout);
	}, [query]);

	const searchQuery = electronTrpc.themeMarketplace.search.useQuery(
		{ query: debouncedQuery },
		{
			enabled: open,
			staleTime: 5 * 60 * 1000,
			retry: 1,
		},
	);
	const installMutation = electronTrpc.themeMarketplace.install.useMutation();

	const handleApply = async (
		extension: NonNullable<typeof searchQuery.data>[number],
	) => {
		setInstallingId(extension.id);
		try {
			const result = await installMutation.mutateAsync({
				namespace: extension.namespace,
				name: extension.name,
				version: extension.version,
				displayName: extension.displayName,
				description: extension.description,
			});
			const summary = upsertCustomThemes(result.themes);
			const firstTheme = result.themes[0];
			if (!firstTheme) {
				throw new Error("The extension did not contain a compatible theme");
			}
			setTheme(firstTheme.id);
			onOpenChange(false);

			const variantCount = result.themes.length - 1;
			toast.success(`Applied ${firstTheme.name}`, {
				description:
					variantCount > 0
						? `${variantCount} additional variant${variantCount === 1 ? "" : "s"} added to your theme list.`
						: summary.updated > 0
							? "Your installed copy was updated."
							: `From ${extension.displayName} on Open VSX.`,
			});
			if (result.issues.length > 0) {
				toast.warning("Some theme details could not be imported", {
					description: result.issues[0],
				});
			}
		} catch (error) {
			toast.error("Could not apply VS Code theme", {
				description:
					error instanceof Error ? error.message : "Theme installation failed",
			});
		} finally {
			setInstallingId(null);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange} modal>
			<DialogContent className="flex max-h-[min(680px,calc(100vh-2rem))] max-w-2xl flex-col gap-0 overflow-hidden p-0">
				<DialogHeader className="border-b px-5 py-4 pr-12">
					<DialogTitle>Browse VS Code themes</DialogTitle>
					<DialogDescription>
						Search Open VSX and apply a color theme directly to Superset.
					</DialogDescription>
				</DialogHeader>

				<div className="border-b p-4">
					<div className="relative">
						<HiOutlineMagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search themes, publishers, or styles"
							aria-label="Search VS Code themes"
							className="pl-9"
							autoFocus
						/>
					</div>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto p-2">
					{searchQuery.isLoading ? (
						<div className="space-y-1 p-1">
							{themeResultSkeletonIds.map((skeletonId) => (
								<div
									key={skeletonId}
									className="flex items-center gap-3 rounded-md p-3"
								>
									<Skeleton className="h-9 w-9 shrink-0" />
									<div className="min-w-0 flex-1 space-y-2">
										<Skeleton className="h-3.5 w-2/5" />
										<Skeleton className="h-3 w-4/5" />
									</div>
									<Skeleton className="h-8 w-16" />
								</div>
							))}
						</div>
					) : searchQuery.isError ? (
						<div className="flex min-h-56 cursor-text select-text flex-col items-center justify-center gap-3 px-6 text-center">
							<div>
								<div className="text-sm font-medium">
									Open VSX could not be reached
								</div>
								<div className="mt-1 text-xs text-muted-foreground">
									Check your connection, then try again.
								</div>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => searchQuery.refetch()}
							>
								Try again
							</Button>
						</div>
					) : searchQuery.data?.length === 0 ? (
						<div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
							<div className="text-sm font-medium">No themes found</div>
							<div className="mt-1 text-xs text-muted-foreground">
								Try a theme name like Dracula, Catppuccin, or Solarized.
							</div>
						</div>
					) : (
						<div className="space-y-1">
							{searchQuery.data?.map((extension) => {
								const isInstalling = installingId === extension.id;
								return (
									<div
										key={extension.id}
										className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent/60"
									>
										<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted text-sm font-semibold text-muted-foreground">
											{extension.displayName.charAt(0).toUpperCase()}
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-1.5">
												<span className="truncate text-sm font-medium">
													{extension.displayName}
												</span>
												{extension.verified ? (
													<HiMiniCheckBadge
														className="h-4 w-4 shrink-0 text-primary"
														aria-label="Verified publisher"
													/>
												) : null}
											</div>
											<div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
												<span className="truncate">{extension.namespace}</span>
												<span aria-hidden="true">·</span>
												<span className="shrink-0">
													{compactNumberFormatter.format(
														extension.downloadCount,
													)}{" "}
													downloads
												</span>
												{extension.averageRating ? (
													<>
														<span aria-hidden="true">·</span>
														<span className="shrink-0">
															{extension.averageRating.toFixed(1)} ★
														</span>
													</>
												) : null}
											</div>
											{extension.description ? (
												<p className="mt-1 truncate text-xs text-muted-foreground">
													{extension.description}
												</p>
											) : null}
										</div>
										<div className="flex shrink-0 items-center gap-2">
											{extension.verified ? (
												<Badge
													variant="outline"
													className="hidden text-[10px] sm:inline-flex"
												>
													Verified
												</Badge>
											) : null}
											<Button
												size="sm"
												onClick={() => handleApply(extension)}
												disabled={installingId !== null}
											>
												{isInstalling ? (
													<>
														<HiOutlineArrowPath className="h-4 w-4 animate-spin" />
														Applying
													</>
												) : (
													"Apply"
												)}
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				<div className="border-t bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
					Theme colors are imported from Open VSX. Extension code is never
					installed or run.
				</div>
			</DialogContent>
		</Dialog>
	);
}
