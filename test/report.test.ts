import assert from "node:assert/strict";
import test from "node:test";
import type { EvolveConfig, ScenarioRun } from "../src/types.js";
import { evaluateRuns, renderMarkdown } from "../src/report.js";

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

function run(side: "base" | "head", filesChanged: number, success = true): ScenarioRun {
  return {
    scenarioId: "probe",
    side,
    attempt: 1,
    revision: side,
    success,
    agent: {
      command: ["agent"],
      exitCode: success ? 0 : 1,
      signal: null,
      timedOut: false,
      durationMs: 100,
      stdout: "",
      stderr: "",
      stdoutTruncated: false,
      stderrTruncated: false,
    },
    verifier: null,
    telemetry: null,
    metrics: {
      filesChanged,
      linesAdded: filesChanged,
      linesDeleted: 0,
      churn: filesChanged,
      testFilesChanged: 0,
      dependenciesAdded: [],
      dependenciesChanged: [],
      changedPaths: [],
    },
  };
}

test("evaluateRuns warns when head needs more files", () => {
  const report = evaluateRuns("repo", "base", "head", config, [run("base", 1), run("head", 3)]);
  assert.equal(report.conclusion, "warning");
  assert.equal(report.findings[0]?.metric, "filesChanged");
  assert.match(renderMarkdown(report), /Median changed files increased from 1 to 3/);
});

test("evaluateRuns is inconclusive when both sides fail", () => {
  const report = evaluateRuns("repo", "base", "head", config, [run("base", 0, false), run("head", 0, false)]);
  assert.equal(report.conclusion, "inconclusive");
});

test("evaluateRuns uses medians across repetitions", () => {
  const repeatedConfig: EvolveConfig = {
    ...config,
    execution: { repetitions: 3, maxCoefficientOfVariationPercent: 10_000 },
  };
  const runs = [
    { ...run("base", 1), attempt: 1 },
    { ...run("head", 2), attempt: 1 },
    { ...run("base", 1), attempt: 2 },
    { ...run("head", 8), attempt: 2 },
    { ...run("base", 2), attempt: 3 },
    { ...run("head", 3), attempt: 3 },
  ];
  const report = evaluateRuns("repo", "base", "head", repeatedConfig, runs);
  assert.equal(report.summaries[0]?.base.medianFilesChanged, 1);
  assert.equal(report.summaries[0]?.head.medianFilesChanged, 3);
});

test("evaluateRuns rejects high-variance evidence as inconclusive", () => {
  const repeatedConfig: EvolveConfig = {
    ...config,
    execution: { repetitions: 2, maxCoefficientOfVariationPercent: 5 },
  };
  const fast = { ...run("base", 1), attempt: 1 };
  const slow = {
    ...run("base", 1),
    attempt: 2,
    agent: { ...run("base", 1).agent, durationMs: 1_000 },
  };
  const report = evaluateRuns("repo", "base", "head", repeatedConfig, [
    fast,
    slow,
    { ...run("head", 1), attempt: 1 },
    { ...run("head", 1), attempt: 2 },
  ]);
  assert.equal(report.conclusion, "inconclusive");
  assert.equal(report.findings[0]?.metric, "durationVariability");
});

test("evaluateRuns warns on verified token increases", () => {
  const tokenConfig: EvolveConfig = {
    ...config,
    thresholds: { ...config.thresholds, maxAddedFiles: 10, maxChurnIncreasePercent: 10_000, maxTokenIncreasePercent: 20 },
  };
  const base = {
    ...run("base", 1),
    telemetry: {
      source: "codex-jsonl" as const,
      turns: 1,
      inputTokens: 80,
      cachedInputTokens: 20,
      cacheWriteInputTokens: 0,
      outputTokens: 20,
      reasoningOutputTokens: 5,
      totalTokens: 100,
    },
  };
  const head = {
    ...run("head", 1),
    telemetry: {
      ...base.telemetry,
      inputTokens: 160,
      outputTokens: 40,
      totalTokens: 200,
    },
  };
  const report = evaluateRuns("repo", "base", "head", tokenConfig, [base, head]);
  assert.equal(report.conclusion, "warning");
  assert.equal(report.findings[0]?.metric, "totalTokens");
});
