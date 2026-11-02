import assert from "node:assert/strict";
import test from "node:test";
import { renderHtml } from "../src/html.js";
import type { ComparisonReport } from "../src/types.js";

test("renderHtml creates a self-contained escaped report", () => {
  const report: ComparisonReport = {
    schemaVersion: 1,
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
          medianDurationMs: 10,
          medianFilesChanged: 1,
          medianChurn: 2,
          medianTestFilesChanged: 0,
          medianDependenciesAdded: 0,
          medianDependenciesChanged: 0,
          durationCoefficientOfVariationPercent: 0,
        },
        head: {
          successRate: 1,
          medianDurationMs: 20,
          medianFilesChanged: 4,
          medianChurn: 8,
          medianTestFilesChanged: 1,
          medianDependenciesAdded: 0,
          medianDependenciesChanged: 0,
          durationCoefficientOfVariationPercent: 0,
        },
      },
    ],
    runs: [],
  };

  const html = renderHtml(report);
  assert.match(html, /<!doctype html>/);
  assert.match(html, /Counterfactual evolvability report/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /Unsafe &lt;script&gt;alert\(1\)&lt;\/script&gt; text/);
  assert.doesNotMatch(html, /https?:\/\//);
});
