import { spawn } from "node:child_process";
import {
	getBuiltinAgentDefinition,
	isBuiltinAgentId,
	isTerminalAgentDefinition,
} from "@superset/shared/agent-catalog";
import {
	buildAgentModelArgs,
	buildAgentModelEnv,
} from "@superset/shared/agent-models";
import {
	buildArgvCommand,
	envOverlayPrefix,
	quoteSingleShell,
} from "@superset/shared/agent-prompt-launch";
import type { HostDb } from "../db";
import { resolveHostAgentConfig } from "../trpc/router/agents/agents";

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;

export type HeadlessAgentFailureCode =
	| "unsupported"
	| "spawn_failed"
	| "timed_out"
	| "output_too_large"
	| "non_zero_exit";

export class HeadlessAgentError extends Error {
	constructor(
		readonly code: HeadlessAgentFailureCode,
		message: string,
		readonly stderrTail?: string,
	) {
		super(message);
		this.name = "HeadlessAgentError";
	}
}

export interface ResolvedHeadlessAgent {
	id: string;
	presetId: string;
	label: string;
	command: string;
}

/**
 * Resolve a configured terminal-agent instance to its curated one-shot form.
 *
 * Only the configured executable and environment are reused. Interactive args
 * are deliberately excluded because they may contain write/approval bypasses;
 * the built-in non-interactive definition is the read-only trust boundary.
 */
export function resolveHeadlessAgent(
	db: HostDb,
	agent: string,
	model?: string,
): ResolvedHeadlessAgent | null {
	const config = resolveHostAgentConfig(db, agent);
	if (!config || !isBuiltinAgentId(config.presetId)) return null;

	const definition = getBuiltinAgentDefinition(config.presetId);
	if (
		!isTerminalAgentDefinition(definition) ||
		!definition.nonInteractiveCommand
	) {
		return null;
	}

	const [, ...headlessArgs] = definition.nonInteractiveCommand
		.trim()
		.split(/\s+/);
	const modelArgs = buildAgentModelArgs(config.presetId, model);
	const modelEnv = buildAgentModelEnv(config.presetId, model);
	const command = `${envOverlayPrefix({
		...config.env,
		...modelEnv,
	})}${buildArgvCommand([config.command, ...modelArgs, ...headlessArgs])}`;

	return {
		id: config.id,
		presetId: config.presetId,
		label: config.label,
		command,
	};
}

export function supportsHeadlessAgentPreset(presetId: string): boolean {
	if (!isBuiltinAgentId(presetId)) return false;
	const definition = getBuiltinAgentDefinition(presetId);
	return (
		isTerminalAgentDefinition(definition) &&
		Boolean(definition.nonInteractiveCommand)
	);
}

export async function runHeadlessAgent({
	db,
	agent,
	prompt,
	cwd,
	model,
	timeoutMs = DEFAULT_TIMEOUT_MS,
	maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
}: {
	db: HostDb;
	agent: string;
	prompt: string;
	cwd: string;
	model?: string;
	timeoutMs?: number;
	maxOutputBytes?: number;
}): Promise<{ stdout: string; resolved: ResolvedHeadlessAgent }> {
	const resolved = resolveHeadlessAgent(db, agent, model);
	if (!resolved) {
		throw new HeadlessAgentError(
			"unsupported",
			"The selected agent does not support read-only headless tasks.",
		);
	}

	const shell =
		process.env.SHELL ||
		(process.platform === "darwin" ? "/bin/zsh" : "/bin/bash");
	const shellCommand = `${resolved.command} ${quoteSingleShell(prompt)}`;

	// Provider keys inherited by the desktop can override the CLI account the
	// user selected. Config-specific env is already encoded in `command`, so
	// strip only inherited keys and let the CLI use its own stored credentials.
	const env = { ...process.env };
	delete env.ANTHROPIC_API_KEY;
	delete env.OPENAI_API_KEY;

	return await new Promise((resolve, reject) => {
		const usesProcessGroup = process.platform !== "win32";
		const child = spawn(shell, ["-lc", shellCommand], {
			cwd,
			env,
			detached: usesProcessGroup,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		let outputBytes = 0;
		let settled = false;

		const terminate = () => {
			if (usesProcessGroup && child.pid) {
				try {
					process.kill(-child.pid, "SIGKILL");
					return;
				} catch {
					// The process may have already exited between the check and kill.
				}
			}
			child.kill("SIGKILL");
		};

		const settle = (
			result:
				| { kind: "resolve"; stdout: string }
				| { kind: "reject"; error: HeadlessAgentError },
		) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			if (result.kind === "resolve") {
				resolve({ stdout: result.stdout, resolved });
			} else {
				reject(result.error);
			}
		};

		const timer = setTimeout(() => {
			terminate();
			settle({
				kind: "reject",
				error: new HeadlessAgentError(
					"timed_out",
					`The agent did not finish within ${Math.round(timeoutMs / 1000)} seconds.`,
					stderr.slice(-500),
				),
			});
		}, timeoutMs);

		const appendOutput = (target: "stdout" | "stderr", chunk: Buffer) => {
			if (settled) return;
			outputBytes += chunk.byteLength;
			if (outputBytes > maxOutputBytes) {
				terminate();
				settle({
					kind: "reject",
					error: new HeadlessAgentError(
						"output_too_large",
						"The agent returned too much output.",
						stderr.slice(-500),
					),
				});
				return;
			}
			if (target === "stdout") stdout += chunk.toString();
			else stderr += chunk.toString();
		};

		child.stdout.on("data", (chunk: Buffer) => appendOutput("stdout", chunk));
		child.stderr.on("data", (chunk: Buffer) => appendOutput("stderr", chunk));
		child.on("error", (error) => {
			settle({
				kind: "reject",
				error: new HeadlessAgentError(
					"spawn_failed",
					`Failed to start ${resolved.label}: ${error.message}`,
				),
			});
		});
		child.on("close", (code) => {
			if (code === 0) {
				settle({ kind: "resolve", stdout });
				return;
			}
			settle({
				kind: "reject",
				error: new HeadlessAgentError(
					"non_zero_exit",
					`${resolved.label} exited before finding a logo.`,
					stderr.slice(-500),
				),
			});
		});
	});
}
