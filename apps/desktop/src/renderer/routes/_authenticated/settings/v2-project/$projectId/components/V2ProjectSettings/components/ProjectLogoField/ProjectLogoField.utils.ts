import type { HostAgentConfig } from "@superset/host-service/settings";
import {
	getBuiltinAgentDefinition,
	isBuiltinAgentId,
	isTerminalAgentDefinition,
} from "@superset/shared/agent-catalog";
import type { AgentSelectAgent } from "renderer/components/AgentSelect";

export function getCompatibleLogoAgents(
	configs: readonly HostAgentConfig[],
): AgentSelectAgent[] {
	return configs.flatMap((config) => {
		if (!isBuiltinAgentId(config.presetId)) return [];
		const definition = getBuiltinAgentDefinition(config.presetId);
		if (
			!isTerminalAgentDefinition(definition) ||
			!definition.nonInteractiveCommand
		) {
			return [];
		}
		return [
			{
				id: config.id,
				label: config.label,
				iconId: config.iconId ?? config.presetId,
			},
		];
	});
}
