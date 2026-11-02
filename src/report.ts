import type {
  ComparisonReport,
  EvolveConfig,
  Finding,
  MetricSummary,
  ScenarioRun,
  ScenarioSummary,
} from "./types.js";

interface RunGroup {
  base: ScenarioRun[];
  head: ScenarioRun[];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 2) return 0;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  if (mean === 0) return values.every((value) => value === 0) ? 0 : null;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  return (Math.sqrt(variance) / mean) * 100;
}

function percentIncrease(base: number, head: number): number {
  if (base === 0) return head === 0 ? 0 : Number.POSITIVE_INFINITY;
  return ((head - base) / base) * 100;
}

function formatPercent(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "unbounded (base was zero)";
}

function groupRuns(runs: ScenarioRun[]): Map<string, RunGroup> {
  const groups = new Map<string, RunGroup>();
  for (const run of runs) {
    const group = groups.get(run.scenarioId) ?? { base: [], head: [] };
    group[run.side].push(run);
    groups.set(run.scenarioId, group);
  }
  for (const group of groups.values()) {
    group.base.sort((left, right) => left.attempt - right.attempt);
    group.head.sort((left, right) => left.attempt - right.attempt);
  }
  return groups;
}

function summarize(runs: ScenarioRun[]): MetricSummary {
  const successful = runs.filter((run) => run.success);
  return {
    successRate: runs.length === 0 ? 0 : successful.length / runs.length,
    medianDurationMs: median(successful.map((run) => run.agent.durationMs)),
    medianFilesChanged: median(successful.map((run) => run.metrics.filesChanged)),
    medianChurn: median(successful.map((run) => run.metrics.churn)),
    medianTestFilesChanged: median(successful.map((run) => run.metrics.testFilesChanged)),
    medianDependenciesAdded: median(successful.map((run) => run.metrics.dependenciesAdded.length)),
    medianDependenciesChanged: median(successful.map((run) => run.metrics.dependenciesChanged.length)),
    durationCoefficientOfVariationPercent: coefficientOfVariation(successful.map((run) => run.agent.durationMs)),
  };
}

function numeric(value: number | null): number {
  return value ?? 0;
}

function addThresholdFinding(
  findings: Finding[],
  scenarioId: string,
  metric: string,
  baseValue: number,
  headValue: number,
  maximum: number,
  message: string,
): void {
  if (headValue - baseValue <= maximum) return;
  findings.push({ scenarioId, severity: "warning", metric, message, baseValue, headValue });
}

export function evaluateRuns(
  repository: string,
  baseRevision: string,
  headRevision: string,
  config: EvolveConfig,
  runs: ScenarioRun[],
  now = new Date(),
): ComparisonReport {
  const findings: Finding[] = [];
  const summaries: ScenarioSummary[] = [];
  let hasInconclusiveScenario = false;

  for (const [scenarioId, group] of groupRuns(runs)) {
    const base = summarize(group.base);
    const head = summarize(group.head);
    let status: ScenarioSummary["status"] = "comparable";

    if (group.base.length !== config.execution.repetitions || group.head.length !== config.execution.repetitions) {
      status = "regressed";
      findings.push({
        scenarioId,
        severity: "critical",
        metric: "runCount",
        message: `Expected ${config.execution.repetitions} run(s) per side but received ${group.base.length} base and ${group.head.length} head.`,
      });
    } else if (head.successRate < base.successRate) {
      status = "regressed";
      findings.push({
        scenarioId,
        severity: "critical",
        metric: "successRate",
        message: `Probe success rate fell from ${(base.successRate * 100).toFixed(0)}% to ${(head.successRate * 100).toFixed(0)}%.`,
        baseValue: base.successRate,
        headValue: head.successRate,
      });
    } else if (head.successRate > base.successRate) {
      status = "improved";
      findings.push({
        scenarioId,
        severity: "improvement",
        metric: "successRate",
        message: `Probe success rate improved from ${(base.successRate * 100).toFixed(0)}% to ${(head.successRate * 100).toFixed(0)}%.`,
        baseValue: base.successRate,
        headValue: head.successRate,
      });
    } else if (base.successRate < 1) {
      status = "inconclusive";
      hasInconclusiveScenario = true;
      findings.push({
        scenarioId,
        severity: "info",
        metric: "successRate",
        message: `Both revisions completed ${(base.successRate * 100).toFixed(0)}% of attempts; the scenario is not stable enough to compare.`,
        baseValue: base.successRate,
        headValue: head.successRate,
      });
    }

    const variability = Math.max(
      base.durationCoefficientOfVariationPercent ?? 0,
      head.durationCoefficientOfVariationPercent ?? 0,
    );
    if (status === "comparable" && variability > config.execution.maxCoefficientOfVariationPercent) {
      status = "inconclusive";
      hasInconclusiveScenario = true;
      findings.push({
        scenarioId,
        severity: "info",
        metric: "durationVariability",
        message: `Run duration variability reached ${variability.toFixed(1)}%, above the ${config.execution.maxCoefficientOfVariationPercent.toFixed(1)}% confidence limit.`,
      });
    }

    if (status === "comparable") {
      addThresholdFinding(
        findings,
        scenarioId,
        "filesChanged",
        numeric(base.medianFilesChanged),
        numeric(head.medianFilesChanged),
        config.thresholds.maxAddedFiles,
        `Median changed files increased from ${numeric(base.medianFilesChanged)} to ${numeric(head.medianFilesChanged)}.`,
      );
      const durationIncrease = percentIncrease(numeric(base.medianDurationMs), numeric(head.medianDurationMs));
      if (durationIncrease > config.thresholds.maxDurationIncreasePercent) {
        findings.push({
          scenarioId,
          severity: "warning",
          metric: "durationMs",
          message: `Median agent duration increased by ${formatPercent(durationIncrease)}.`,
          baseValue: numeric(base.medianDurationMs),
          headValue: numeric(head.medianDurationMs),
        });
      }
      const churnIncrease = percentIncrease(numeric(base.medianChurn), numeric(head.medianChurn));
      if (churnIncrease > config.thresholds.maxChurnIncreasePercent) {
        findings.push({
          scenarioId,
          severity: "warning",
          metric: "churn",
          message: `Median patch churn increased by ${formatPercent(churnIncrease)}.`,
          baseValue: numeric(base.medianChurn),
          headValue: numeric(head.medianChurn),
        });
      }
      addThresholdFinding(
        findings,
        scenarioId,
        "testFilesChanged",
        numeric(base.medianTestFilesChanged),
        numeric(head.medianTestFilesChanged),
        config.thresholds.maxAddedTestFiles,
        `Head changes more test files: median ${numeric(base.medianTestFilesChanged)} to ${numeric(head.medianTestFilesChanged)}.`,
      );
      addThresholdFinding(
        findings,
        scenarioId,
        "dependenciesAdded",
        numeric(base.medianDependenciesAdded),
        numeric(head.medianDependenciesAdded),
        config.thresholds.maxAddedDependencies,
        `Head adds more dependencies: median ${numeric(base.medianDependenciesAdded)} to ${numeric(head.medianDependenciesAdded)}.`,
      );
      addThresholdFinding(
        findings,
        scenarioId,
        "dependenciesChanged",
        numeric(base.medianDependenciesChanged),
        numeric(head.medianDependenciesChanged),
        config.thresholds.maxChangedDependencies,
        `Head changes more dependency versions: median ${numeric(base.medianDependenciesChanged)} to ${numeric(head.medianDependenciesChanged)}.`,
      );
    }

    summaries.push({ scenarioId, status, base, head });
  }

  const hasWarning = findings.some((finding) => finding.severity === "warning" || finding.severity === "critical");
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    repository,
    baseRevision,
    headRevision,
    conclusion: hasWarning ? "warning" : hasInconclusiveScenario || summaries.length === 0 ? "inconclusive" : "pass",
    findings,
    summaries,
    runs,
  };
}

function displayMetric(value: number | null): string {
  return value === null ? "—" : Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function renderMarkdown(report: ComparisonReport): string {
  const icon = report.conclusion === "pass" ? "✅" : report.conclusion === "warning" ? "⚠️" : "➖";
  const lines = [
    `# ${icon} EvolveCI: ${report.conclusion}`,
    "",
    `Compared \`${report.baseRevision.slice(0, 12)}\` (base) with \`${report.headRevision.slice(0, 12)}\` (head).`,
    "",
    "## Scenario results",
    "",
    "| Scenario | Status | Base success | Head success | Base files | Head files | Base churn | Head churn |",
    "|---|---|---:|---:|---:|---:|---:|---:|",
  ];

  for (const summary of report.summaries) {
    lines.push(
      `| ${summary.scenarioId} | ${summary.status} | ${(summary.base.successRate * 100).toFixed(0)}% | ${(summary.head.successRate * 100).toFixed(0)}% | ${displayMetric(summary.base.medianFilesChanged)} | ${displayMetric(summary.head.medianFilesChanged)} | ${displayMetric(summary.base.medianChurn)} | ${displayMetric(summary.head.medianChurn)} |`,
    );
  }

  lines.push("", "## Findings", "");
  if (report.findings.length === 0) {
    lines.push("No configured evolvability thresholds regressed.");
  } else {
    for (const finding of report.findings) {
      lines.push(`- **${finding.severity} · ${finding.scenarioId} · ${finding.metric}:** ${finding.message}`);
    }
  }
  lines.push("", "---", "EvolveCI reports evidence for maintainer-approved future-change probes; it does not predict future requirements.", "");
  return lines.join("\n");
}
