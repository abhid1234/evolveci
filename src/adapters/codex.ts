import { runCommand } from "../process.js";
import type { CommandResult, CommandSpec } from "../types.js";

export interface CodexAdapterOptions {
  prompt: string;
  cwd: string;
  codexBin?: string;
  codexCommand?: CommandSpec;
  model?: string;
  profile?: string;
  timeoutMs?: number;
}

function safeIdentifier(value: string, label: string): string {
  if (!/^[A-Za-z0-9._:/-]+$/.test(value)) throw new Error(`${label} contains unsupported characters`);
  return value;
}

function failClosed(result: CommandResult, reason: string): CommandResult {
  const separator = result.stderr.length === 0 || result.stderr.endsWith("\n") ? "" : "\n";
  return {
    ...result,
    exitCode: 1,
    stderr: `${result.stderr}${separator}EvolveCI Codex adapter: ${reason}\n`,
  };
}

function validateJsonlOutcome(result: CommandResult): CommandResult {
  if (result.exitCode !== 0) return result;
  if (result.stdoutTruncated) return failClosed(result, "JSONL output was truncated before its terminal status could be verified");

  let completed = 0;
  for (const line of result.stdout.split("\n")) {
    if (line.trim().length === 0) continue;
    let event: Record<string, unknown>;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return failClosed(result, "JSONL output contained a non-object event");
      }
      event = parsed as Record<string, unknown>;
    } catch {
      return failClosed(result, "JSONL output contained a malformed event");
    }
    if (event.type === "turn.failed" || event.type === "error") {
      return failClosed(result, `Codex emitted terminal event ${String(event.type)}`);
    }
    if (event.type === "turn.completed") completed += 1;
  }
  return completed > 0 ? result : failClosed(result, "JSONL output contained no completed turn");
}

export async function runCodexAdapter(options: CodexAdapterOptions): Promise<CommandResult> {
  if (options.prompt.trim().length === 0) throw new Error("Codex adapter requires a non-empty prompt on stdin");
  if (options.codexBin && options.codexCommand) {
    throw new Error("Codex adapter accepts either codexBin or codexCommand, not both");
  }
  const executable: CommandSpec = options.codexCommand ?? [options.codexBin ?? "codex"];
  const command: [string, ...string[]] = [
    ...executable,
    "exec",
    "--ephemeral",
    "--sandbox",
    "workspace-write",
    "--cd",
    options.cwd,
    "--color",
    "never",
    "--json",
  ];
  if (options.model) command.push("--model", safeIdentifier(options.model, "model"));
  if (options.profile) command.push("--profile", safeIdentifier(options.profile, "profile"));
  command.push("-");
  const result = await runCommand({
    command,
    cwd: options.cwd,
    stdin: options.prompt,
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  return validateJsonlOutcome(result);
}
