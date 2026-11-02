import assert from "node:assert/strict";
import test from "node:test";
import { renderHtml } from "../src/html.js";
import type { ComparisonReport } from "../src/types.js";

test("renderHtml creates a self-contained escaped report", () => {
  const report: ComparisonReport = {
    schemaVersion: 2,
    generatedAt: "2026-11-01T00:00:00.000Z",
    repository: "/tmp/repo",
    baseRevision: "base1234567890",
    headRevision: "head1234567890",
    conclusion: "warning",
    findings: [
      {
        scenarioId: "probe",
        severity: "warning",
        metric: "filesChanged",
        message: "Unsafe <script>alert(1)</script> text",
      },
    ],
    summaries: [
      {
        scenarioId: "probe",
        status: "comparable",
        base: {
          successRate: 1,
          retryableFailures: 0,
          terminalFailures: 0,
          medianDurationMs: 10,
          medianFilesChanged: 1,
          medianChurn: 2,
          medianTestFilesChanged: 0,
          medianDependenciesAdded: 0,
          medianDependenciesChanged: 0,
          durationCoefficientOfVariationPercent: 0,
          medianTotalTokens: 100,
        },
        head: {
          successRate: 1,
          retryableFailures: 0,
          terminalFailures: 0,
          medianDurationMs: 20,
          medianFilesChanged: 4,
          medianChurn: 8,
          medianTestFilesChanged: 1,
          medianDependenciesAdded: 0,
          medianDependenciesChanged: 0,
          durationCoefficientOfVariationPercent: 0,
          medianTotalTokens: 150,
        },
      },
    ],
    runs: [],
  };

  const html = renderHtml(report);
  assert.match(html, /<!doctype html>/);
  assert.match(html, /Counterfactual evolvability report/);
  assert.match(html, /Base failures/);
  assert.match(html, /0 retryable \/ 0 terminal/);
  assert.match(html, /Threshold warnings/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /Unsafe &lt;script&gt;alert\(1\)&lt;\/script&gt; text/);
  assert.doesNotMatch(html, /https?:\/\//);
});

test("renderHtml exposes failed attempts and escapes their summaries", () => {
  const report: ComparisonReport = {
    schemaVersion: 2,
    generatedAt: "2026-11-01T00:00:00.000Z",
    repository: "/tmp/repo",
    baseRevision: "base1234567890",
    headRevision: "head1234567890",
    conclusion: "inconclusive",
    findings: [],
    summaries: [],
    runs: [
      {
        scenarioId: "probe",
        side: "head",
        attempt: 2,
        revision: "head1234567890",
        success: false,
        failure: { stage: "agent", reason: "timeout", retryable: true, summary: "Agent <timed out>." },
        agent: {
          command: ["agent"], exitCode: null, signal: "SIGTERM", timedOut: true, durationMs: 10,
          stdout: "", stderr: "", stdoutTruncated: false, stderrTruncated: false, launchErrorCode: null,
        },
        verifier: {
          command: [], exitCode: null, signal: null, timedOut: false, durationMs: 0,
          stdout: "", stderr: "Verifier skipped because the agent failed.", stdoutTruncated: false,
          stderrTruncated: false, launchErrorCode: null,
        },
        telemetry: null,
        metrics: {
          filesChanged: 0, linesAdded: 0, linesDeleted: 0, churn: 0, testFilesChanged: 0,
          dependenciesAdded: [], dependenciesChanged: [], changedPaths: [],
        },
        metricsError: null,
      },
    ],
  };
  const html = renderHtml(report);
  assert.match(html, /Failed attempts/);
  assert.match(html, /<div class="card-label">Failed attempts<\/div><div class="card-value">1<\/div>/);
  assert.match(html, /probe · head · attempt 2 · retryable/);
  assert.match(html, /Agent &lt;timed out&gt;\./);
  assert.doesNotMatch(html, /Agent <timed out>/);
});
