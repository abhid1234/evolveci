import assert from "node:assert/strict";
import test from "node:test";
import { classifyRunFailure } from "../src/failure.js";
import type { CommandResult } from "../src/types.js";

function result(overrides: Partial<CommandResult> = {}): CommandResult {
  return {
    command: ["tool"],
    exitCode: 0,
    signal: null,
    timedOut: false,
    durationMs: 25,
    stdout: "",
    stderr: "",
    stdoutTruncated: false,
    stderrTruncated: false,
    launchErrorCode: null,
    ...overrides,
  };
}

test("classifyRunFailure keeps successful runs unclassified", () => {
  assert.equal(classifyRunFailure(result(), result()), null);
});

test("classifyRunFailure marks timeouts and transient signals retryable without retrying them", () => {
  assert.deepEqual(classifyRunFailure(result({ timedOut: true, exitCode: null, signal: "SIGTERM", durationMs: 500 }), null), {
    stage: "agent",
    reason: "timeout",
    retryable: true,
    summary: "Agent timed out after 500 ms.",
  });
  assert.deepEqual(classifyRunFailure(result(), result({ exitCode: null, signal: "SIGKILL" })), {
    stage: "verifier",
    reason: "signal",
    retryable: true,
    summary: "Verifier terminated with signal SIGKILL.",
  });
});

test("classifyRunFailure treats nonzero exits as terminal and preserves stage", () => {
  assert.deepEqual(classifyRunFailure(result({ exitCode: 2 }), result({ exitCode: 3 })), {
    stage: "agent",
    reason: "exit-code",
    retryable: false,
    summary: "Agent exited with code 2.",
  });
  assert.deepEqual(classifyRunFailure(result(), result({ exitCode: 3 })), {
    stage: "verifier",
    reason: "exit-code",
    retryable: false,
    summary: "Verifier exited with code 3.",
  });
});

test("classifyRunFailure preserves command launch errors as terminal evidence", () => {
  assert.deepEqual(classifyRunFailure(result({ exitCode: null, stderr: "spawn missing-tool ENOENT", launchErrorCode: "ENOENT" }), null), {
    stage: "agent",
    reason: "launch-error",
    retryable: false,
    summary: "Agent could not be started (ENOENT).",
  });
});

test("classifyRunFailure separates deterministic crashes from transient resource exhaustion", () => {
  assert.equal(classifyRunFailure(result({ exitCode: null, signal: "SIGSEGV" }), null)?.retryable, false);
  assert.equal(classifyRunFailure(result({ exitCode: null, launchErrorCode: "EAGAIN" }), null)?.retryable, true);
});
