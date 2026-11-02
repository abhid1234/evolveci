import type { ComparisonReport, EvolveConfig, Finding, ScenarioRun } from "./types.js";

function percentIncrease(base: number, head: number): number {
  if (base === 0) return head === 0 ? 0 : 100;
  return ((head - base) / base) * 100;
}

function pairRuns(runs: ScenarioRun[]): Map<string, { base?: ScenarioRun; head?: ScenarioRun }> {
  const pairs = new Map<string, { base?: ScenarioRun; head?: ScenarioRun }>();
  for (const run of runs) {
    const pair = pairs.get(run.scenarioId) ?? {};
    pair[run.side] = run;
    pairs.set(run.scenarioId, pair);
  }
  return pairs;
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
  let comparablePairs = 0;

  for (const [scenarioId, pair] of pairRuns(runs)) {
    const { base, head } = pair;
    if (!base || !head) {
      findings.push({ scenarioId, severity: "critical", metric: "run", message: "Missing a base or head run." });
      continue;
    }
    if (!base.success && !head.success) {
      findings.push({
        scenarioId,
        severity: "info",
        metric: "success",
        message: "The scenario failed on both revisions and is not comparable.",
        baseValue: false,
        headValue: false,
      });
      continue;
    }
    comparablePairs += 1;
    if (base.success && !head.success) {
      findings.push({
        scenarioId,
        severity: "critical",
        metric: "success",
        message: "The future-change probe succeeds on base but fails on head.",
        baseValue: true,
        headValue: false,
      });
      continue;
    }
    if (!base.success && head.success) {
      findings.push({
        scenarioId,
        severity: "improvement",
        metric: "success",
        message: "The future-change probe fails on base but succeeds on head.",
        baseValue: false,
        headValue: true,
      });
      continue;
    }

    const filesDelta = head.metrics.filesChanged - base.metrics.filesChanged;
    if (filesDelta > config.thresholds.maxAddedFiles) {
      findings.push({
        scenarioId,
        severity: "warning",
        metric: "filesChanged",
        message: `Head requires ${filesDelta} more changed files than base.`,
        baseValue: base.metrics.filesChanged,
        headValue: head.metrics.filesChanged,
      });
    }

    const durationIncrease = percentIncrease(base.agent.durationMs, head.agent.durationMs);
    if (durationIncrease > config.thresholds.maxDurationIncreasePercent) {
      findings.push({
        scenarioId,
        severity: "warning",
        metric: "durationMs",
        message: `Agent duration increased by ${durationIncrease.toFixed(1)}%.`,
        baseValue: base.agent.durationMs,
        headValue: head.agent.durationMs,
      });
    }

    const churnIncrease = percentIncrease(base.metrics.churn, head.metrics.churn);
    if (churnIncrease > config.thresholds.maxChurnIncreasePercent) {
      findings.push({
        scenarioId,
        severity: "warning",
        metric: "churn",
        message: `Patch churn increased by ${churnIncrease.toFixed(1)}%.`,
        baseValue: base.metrics.churn,
        headValue: head.metrics.churn,
      });
    }

    const testDelta = head.metrics.testFilesChanged - base.metrics.testFilesChanged;
    if (testDelta > config.thresholds.maxAddedTestFiles) {
      findings.push({
        scenarioId,
        severity: "warning",
        metric: "testFilesChanged",
        message: `Head modifies ${testDelta} more test files than base.`,
        baseValue: base.metrics.testFilesChanged,
        headValue: head.metrics.testFilesChanged,
      });
    }

    const dependencyDelta = head.metrics.dependenciesAdded.length - base.metrics.dependenciesAdded.length;
    if (dependencyDelta > config.thresholds.maxAddedDependencies) {
      findings.push({
        scenarioId,
        severity: "warning",
        metric: "dependenciesAdded",
        message: `Head adds ${dependencyDelta} more dependencies than base.`,
        baseValue: base.metrics.dependenciesAdded.length,
        headValue: head.metrics.dependenciesAdded.length,
      });
    }
  }

  const hasWarning = findings.some((finding) => finding.severity === "warning" || finding.severity === "critical");
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    repository,
    baseRevision,
    headRevision,
    conclusion: hasWarning ? "warning" : comparablePairs === 0 ? "inconclusive" : "pass",
    findings,
    runs,
  };
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
    "| Scenario | Base | Head | Base files | Head files | Base churn | Head churn |",
    "|---|---:|---:|---:|---:|---:|---:|",
  ];

  for (const [scenarioId, pair] of pairRuns(report.runs)) {
    const base = pair.base;
    const head = pair.head;
    lines.push(
      `| ${scenarioId} | ${base?.success ? "pass" : "fail"} | ${head?.success ? "pass" : "fail"} | ${base?.metrics.filesChanged ?? "—"} | ${head?.metrics.filesChanged ?? "—"} | ${base?.metrics.churn ?? "—"} | ${head?.metrics.churn ?? "—"} |`,
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
