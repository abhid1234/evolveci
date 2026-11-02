import assert from "node:assert/strict";
import test from "node:test";
import type { EvolveConfig, ScenarioRun } from "../src/types.js";
import { evaluateRuns, renderMarkdown } from "../src/report.js";

const config: EvolveConfig = {
  version: 1,
  agent: { command: ["agent"] },
  thresholds: {
    maxAddedFiles: 0,
    maxDurationIncreasePercent: 100,
    maxChurnIncreasePercent: 100,
    maxAddedTestFiles: 0,
    maxAddedDependencies: 0,
  },
  scenarios: [{ id: "probe", prompt: "Probe", verify: ["verify"] }],
};

function run(side: "base" | "head", filesChanged: number, success = true): ScenarioRun {
  return {
    scenarioId: "probe",
    side,
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
    },
    verifier: null,
    metrics: {
      filesChanged,
      linesAdded: filesChanged,
      linesDeleted: 0,
      churn: filesChanged,
      testFilesChanged: 0,
      dependenciesAdded: [],
      changedPaths: [],
    },
  };
}

test("evaluateRuns warns when head needs more files", () => {
  const report = evaluateRuns("repo", "base", "head", config, [run("base", 1), run("head", 3)]);
  assert.equal(report.conclusion, "warning");
  assert.equal(report.findings[0]?.metric, "filesChanged");
  assert.match(renderMarkdown(report), /Head requires 2 more changed files/);
});

test("evaluateRuns is inconclusive when both sides fail", () => {
  const report = evaluateRuns("repo", "base", "head", config, [run("base", 0, false), run("head", 0, false)]);
  assert.equal(report.conclusion, "inconclusive");
});
