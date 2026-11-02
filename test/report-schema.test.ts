import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRuns } from "../src/report.js";
import type { EvolveConfig, ScenarioRun } from "../src/types.js";
import { reportV2ValidationError } from "./report-schema-helper.js";

const config: EvolveConfig = {
  version: 1,
  agent: {
    command: ["agent"],
    inheritEnvironment: false,
    passEnvironment: [],
    promptTransport: "environment",
    telemetryFormat: "none",
  },
  execution: { repetitions: 1, maxCoefficientOfVariationPercent: 30 },
  thresholds: {
    maxAddedFiles: 0,
    maxDurationIncreasePercent: 100,
    maxChurnIncreasePercent: 100,
    maxAddedTestFiles: 0,
    maxAddedDependencies: 0,
    maxChangedDependencies: 0,
    maxTokenIncreasePercent: 50,
  },
  scenarios: [{ id: "probe", prompt: "Probe", verify: ["verify"] }],
};

function run(side: "base" | "head", success: true): Extract<ScenarioRun, { success: true }>;
function run(side: "base" | "head", success: false): Extract<ScenarioRun, { failure: { stage: "agent"; reason: "timeout" } }>;
function run(side: "base" | "head", success: boolean): ScenarioRun {
  const evidence = {
    scenarioId: "probe",
    side,
    attempt: 1,
    revision: side === "base" ? "1111111" : "2222222",
    telemetry: null,
    metrics: {
      filesChanged: 0,
      linesAdded: 0,
      linesDeleted: 0,
      churn: 0,
      testFilesChanged: 0,
      dependenciesAdded: [],
      dependenciesChanged: [],
      changedPaths: [],
    },
    metricsError: null,
  };
  return success
    ? {
        ...evidence,
        success: true,
        failure: null,
        agent: {
          command: ["agent"], exitCode: 0, signal: null, timedOut: false, durationMs: 50,
          stdout: "", stderr: "", stdoutTruncated: false, stderrTruncated: false, launchErrorCode: null,
        },
        verifier: {
          command: ["verify"], exitCode: 0, signal: null, timedOut: false, durationMs: 10,
          stdout: "", stderr: "", stdoutTruncated: false, stderrTruncated: false, launchErrorCode: null,
        },
      }
    : {
        ...evidence,
        success: false,
        failure: { stage: "agent", reason: "timeout", retryable: true, summary: "Agent timed out after 50 ms." },
        agent: {
          command: ["agent"], exitCode: null, signal: "SIGTERM", timedOut: true, durationMs: 50,
          stdout: "", stderr: "", stdoutTruncated: false, stderrTruncated: false, launchErrorCode: null,
        },
        verifier: {
          command: [], exitCode: null, signal: null, timedOut: false, durationMs: 0,
          stdout: "", stderr: "Verifier skipped because the agent failed.", stdoutTruncated: false,
          stderrTruncated: false, launchErrorCode: null,
        },
      };
}

function clone(report: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(report)) as Record<string, unknown>;
}

test("generated v2 reports satisfy the published Draft 2020-12 schema", async () => {
  const report = evaluateRuns("repo", "1111111", "2222222", config, [run("base", true), run("head", false)]);

  assert.equal(await reportV2ValidationError(report), null);

  const missingFailure = clone(report);
  delete (missingFailure.runs as Array<Record<string, unknown>>)[0]?.failure;
  assert.notEqual(await reportV2ValidationError(missingFailure), null);

  const inconsistentSuccess = clone(report);
  (inconsistentSuccess.runs as Array<Record<string, unknown>>)[0]!.failure = {
    stage: "agent",
    reason: "exit-code",
    retryable: false,
    summary: "Agent exited with code 1.",
  };
  assert.notEqual(await reportV2ValidationError(inconsistentSuccess), null);

  const contradictoryRetryability = clone(report);
  ((contradictoryRetryability.runs as Array<Record<string, unknown>>)[1]!.failure as Record<string, unknown>)
    .retryable = false;
  assert.notEqual(await reportV2ValidationError(contradictoryRetryability), null);

  const transientSignal = clone(report);
  const transientSignalRun = (transientSignal.runs as Array<Record<string, unknown>>)[1]!;
  (transientSignalRun.failure as Record<string, unknown>).reason = "signal";
  (transientSignalRun.agent as Record<string, unknown>).timedOut = false;
  assert.equal(await reportV2ValidationError(transientSignal), null);

  const deterministicCrash = clone(transientSignal);
  const deterministicCrashRun = (deterministicCrash.runs as Array<Record<string, unknown>>)[1]!;
  (deterministicCrashRun.agent as Record<string, unknown>).signal = "SIGSEGV";
  assert.notEqual(await reportV2ValidationError(deterministicCrash), null);

  const transientLaunch = clone(report);
  const transientLaunchRun = (transientLaunch.runs as Array<Record<string, unknown>>)[1]!;
  Object.assign(transientLaunchRun.failure as Record<string, unknown>, { reason: "launch-error", retryable: true });
  Object.assign(transientLaunchRun.agent as Record<string, unknown>, {
    signal: null,
    timedOut: false,
    stderr: "spawn EAGAIN",
    launchErrorCode: "EAGAIN",
  });
  assert.equal(await reportV2ValidationError(transientLaunch), null);

  const deterministicLaunch = clone(transientLaunch);
  const deterministicLaunchRun = (deterministicLaunch.runs as Array<Record<string, unknown>>)[1]!;
  (deterministicLaunchRun.agent as Record<string, unknown>).launchErrorCode = "ENOENT";
  assert.notEqual(await reportV2ValidationError(deterministicLaunch), null);

  const unavailableMetrics = clone(report);
  const unavailableRun = (unavailableMetrics.runs as Array<Record<string, unknown>>)[1]!;
  unavailableRun.metrics = null;
  unavailableRun.metricsError = "Change metrics could not be collected.";
  assert.equal(await reportV2ValidationError(unavailableMetrics), null);

  const fabricatedAvailability = clone(unavailableMetrics);
  (fabricatedAvailability.runs as Array<Record<string, unknown>>)[1]!.metricsError = null;
  assert.notEqual(await reportV2ValidationError(fabricatedAvailability), null);

  const missingVerifier = clone(report);
  ((missingVerifier.runs as Array<Record<string, unknown>>)[1]!.failure as Record<string, unknown>).stage = "verifier";
  assert.notEqual(await reportV2ValidationError(missingVerifier), null);

  const contradictorySignal = clone(report);
  const signalRun = (contradictorySignal.runs as Array<Record<string, unknown>>)[1]!;
  (signalRun.failure as Record<string, unknown>).reason = "signal";
  (signalRun.agent as Record<string, unknown>).exitCode = 0;
  (signalRun.agent as Record<string, unknown>).timedOut = false;
  assert.notEqual(await reportV2ValidationError(contradictorySignal), null);

  const verifierRanAfterAgentFailure = clone(report);
  const failedRun = (verifierRanAfterAgentFailure.runs as Array<Record<string, unknown>>)[1]!;
  failedRun.verifier = (verifierRanAfterAgentFailure.runs as Array<Record<string, unknown>>)[0]!.verifier;
  assert.notEqual(await reportV2ValidationError(verifierRanAfterAgentFailure), null);

  const missingFailureCount = clone(report);
  delete ((missingFailureCount.summaries as Array<Record<string, unknown>>)[0]!.base as Record<string, unknown>)
    .retryableFailures;
  assert.notEqual(await reportV2ValidationError(missingFailureCount), null);
});
