import { spawn } from "node:child_process";
import type { CommandResult, CommandSpec } from "./types.js";

const MAX_CAPTURE_BYTES = 2 * 1024 * 1024;

function appendBounded(current: string, chunk: Buffer): { value: string; truncated: boolean } {
  if (Buffer.byteLength(current) >= MAX_CAPTURE_BYTES) return { value: current, truncated: true };
  const remaining = MAX_CAPTURE_BYTES - Buffer.byteLength(current);
  return {
    value: current + chunk.subarray(0, remaining).toString("utf8"),
    truncated: chunk.length > remaining,
  };
}

export interface RunCommandOptions {
  command: CommandSpec;
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  inheritEnv?: boolean;
  stdin?: string;
}

export function runCommand(options: RunCommandOptions): Promise<CommandResult> {
  const [executable, ...args] = options.command;
  const startedAt = performance.now();

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: { ...(options.inheritEnv === false ? {} : process.env), ...options.env },
      shell: false,
      stdio: [options.stdin === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let forceKill: NodeJS.Timeout | undefined;
    const timer = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
          forceKill = setTimeout(() => child.kill("SIGKILL"), 1_000);
        }, options.timeoutMs)
      : undefined;

    child.stdout?.on("data", (chunk: Buffer) => {
      const appended = appendBounded(stdout, chunk);
      stdout = appended.value;
      stdoutTruncated ||= appended.truncated;
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const appended = appendBounded(stderr, chunk);
      stderr = appended.value;
      stderrTruncated ||= appended.truncated;
    });
    if (options.stdin !== undefined) child.stdin?.end(options.stdin);
    child.on("error", reject);
    child.on("close", (exitCode, signal) => {
      if (timer) clearTimeout(timer);
      if (forceKill) clearTimeout(forceKill);
      resolve({
        command: [...options.command],
        exitCode,
        signal,
        timedOut,
        durationMs: Math.round(performance.now() - startedAt),
        stdout,
        stderr,
        stdoutTruncated,
        stderrTruncated,
      });
    });
  });
}
