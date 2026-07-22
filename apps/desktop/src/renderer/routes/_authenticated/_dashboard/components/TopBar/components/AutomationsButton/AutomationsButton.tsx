import { Button } from "@superset/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { LuClock } from "react-icons/lu";
import { useFailedAutomations } from "renderer/routes/_authenticated/_dashboard/hooks/useFailedAutomations";

interface AutomationsButtonProps {
	tooltipSide?: "top" | "right" | "bottom" | "left";
}

export function AutomationsButton({
	tooltipSide = "bottom",
}: AutomationsButtonProps) {
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const isAutomationsOpen = !!matchRoute({ to: "/automations", fuzzy: true });
	const { myFailedCount } = useFailedAutomations();
	const label =
		myFailedCount > 0 ? `Automations, ${myFailedCount} failing` : "Automations";

	return (
		<Tooltip delayDuration={150}>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon-xs"
					type="button"
					aria-label={label}
					aria-current={isAutomationsOpen ? "page" : undefined}
					onClick={() => navigate({ to: "/automations" })}
					className={cn(
						"no-drag relative text-muted-foreground hover:text-foreground",
						isAutomationsOpen && "bg-accent text-foreground",
					)}
				>
					<LuClock className="size-3.5" />
					{myFailedCount > 0 && (
						<span
							aria-hidden="true"
							className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-red-500"
						/>
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent side={tooltipSide} sideOffset={6} showArrow={false}>
				{myFailedCount > 0
					? `Automations (${myFailedCount} failing)`
					: "Automations"}
			</TooltipContent>
		</Tooltip>
	);
}
