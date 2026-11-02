import { runCommand } from "../process.js";
import type { CommandResult, CommandSpec } from "../types.js";

export interface CodexAdapterOptions {
  prompt: string;
  cwd: string;
  codexBin?: string;
  model?: string;
  profile?: string;
  timeoutMs?: number;
}

function safeIdentifier(value: string, label: string): string {
  if (!/^[A-Za-z0-9._:/-]+$/.test(value)) throw new Error(`${label} contains unsupported characters`);
  return value;
}

export async function runCodexAdapter(options: CodexAdapterOptions): Promise<CommandResult> {
  if (options.prompt.trim().length === 0) throw new Error("Codex adapter requires a non-empty prompt on stdin");
  const command: string[] = [
    options.codexBin ?? "codex",
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
  return runCommand({
    command: command as unknown as CommandSpec,
    cwd: options.cwd,
    stdin: options.prompt,
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
}
