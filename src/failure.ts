import type { CommandResult, RetryableLaunchErrorCode, RetryableSignal, RunFailure } from "./types.js";

const RETRYABLE_SIGNALS = new Set<RetryableSignal>(["SIGHUP", "SIGINT", "SIGKILL", "SIGTERM"]);
const RETRYABLE_LAUNCH_ERROR_CODES = new Set<RetryableLaunchErrorCode>(["EAGAIN", "EMFILE", "ENFILE", "ENOMEM", "ETXTBSY"]);

function classifyCommandFailure(stage: RunFailure["stage"], result: CommandResult): RunFailure | null {
  const label = stage === "agent" ? "Agent" : "Verifier";
  if (result.timedOut) {
    return {
      stage,
      reason: "timeout",
      retryable: true,
      summary: `${label} timed out after ${result.durationMs} ms.`,
    };
  }
  if (result.signal !== null) {
    const summary = `${label} terminated with signal ${result.signal}.`;
    return RETRYABLE_SIGNALS.has(result.signal as RetryableSignal)
      ? { stage, reason: "signal", retryable: true, summary }
      : { stage, reason: "signal", retryable: false, summary };
  }
  if (result.exitCode === null) {
    const summary = `${label} could not be started${result.launchErrorCode ? ` (${result.launchErrorCode})` : ""}.`;
    return result.launchErrorCode !== null
      && RETRYABLE_LAUNCH_ERROR_CODES.has(result.launchErrorCode as RetryableLaunchErrorCode)
      ? { stage, reason: "launch-error", retryable: true, summary }
      : { stage, reason: "launch-error", retryable: false, summary };
  }
  if (result.exitCode !== 0) {
    return {
      stage,
      reason: "exit-code",
      retryable: false,
      summary: `${label} exited with code ${result.exitCode}.`,
    };
  }
  return null;
}

export function classifyRunFailure(agent: CommandResult, verifier: CommandResult | null): RunFailure | null {
  return classifyCommandFailure("agent", agent) ?? (verifier ? classifyCommandFailure("verifier", verifier) : null);
}
