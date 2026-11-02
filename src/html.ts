import type { ComparisonReport, Finding, ScenarioSummary } from "./types.js";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function metric(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function scenarioRow(summary: ScenarioSummary): string {
  return `<tr>
    <th scope="row">${escapeHtml(summary.scenarioId)}</th>
    <td><span class="status status-${summary.status}">${summary.status}</span></td>
    <td>${(summary.base.successRate * 100).toFixed(0)}%</td>
    <td>${(summary.head.successRate * 100).toFixed(0)}%</td>
    <td>${metric(summary.base.medianFilesChanged)}</td>
    <td>${metric(summary.head.medianFilesChanged)}</td>
    <td>${metric(summary.base.medianChurn)}</td>
    <td>${metric(summary.head.medianChurn)}</td>
  </tr>`;
}

function findingItem(finding: Finding): string {
  return `<li class="finding finding-${finding.severity}">
    <div class="finding-meta">${escapeHtml(finding.severity)} · ${escapeHtml(finding.scenarioId)} · ${escapeHtml(finding.metric)}</div>
    <div>${escapeHtml(finding.message)}</div>
  </li>`;
}

export function renderHtml(report: ComparisonReport): string {
  const warningCount = report.findings.filter((finding) => finding.severity === "warning" || finding.severity === "critical").length;
  const comparableCount = report.summaries.filter((summary) => summary.status === "comparable" || summary.status === "improved").length;
  const title = `EvolveCI · ${report.conclusion}`;
  const rows = report.summaries.map(scenarioRow).join("\n");
  const findings = report.findings.length > 0
    ? report.findings.map(findingItem).join("\n")
    : '<li class="finding finding-pass"><div>No configured evolvability thresholds regressed.</div></li>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; --bg: #0b0d10; --panel: #12161c; --panel-2: #171c23; --text: #edf2f7; --muted: #96a1af; --line: #2a323d; --green: #55d68b; --amber: #ffbd4a; --red: #ff6b6b; --blue: #78a9ff; }
    * { box-sizing: border-box; }
    body { margin: 0; background: radial-gradient(circle at 15% 0%, #17202c 0, var(--bg) 36rem); color: var(--text); font: 15px/1.55 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 56px 0 72px; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
    h1, h2 { margin: 0; letter-spacing: -0.03em; }
    h1 { font-size: clamp(34px, 6vw, 64px); line-height: 1; }
    h2 { font-size: 21px; margin-bottom: 16px; }
    .eyebrow { color: var(--blue); font: 700 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .14em; text-transform: uppercase; margin-bottom: 12px; }
    .revision { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; text-align: right; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
    .card, section { background: color-mix(in srgb, var(--panel) 92%, transparent); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 16px 50px rgba(0,0,0,.18); }
    .card { padding: 18px; }
    .card-label { color: var(--muted); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
    .card-value { margin-top: 8px; font-size: 28px; font-weight: 750; }
    .conclusion-warning { color: var(--amber); }
    .conclusion-pass { color: var(--green); }
    .conclusion-inconclusive { color: var(--blue); }
    section { overflow: hidden; margin-top: 18px; padding: 22px; }
    .table-wrap { overflow-x: auto; margin: 0 -22px -22px; }
    table { width: 100%; min-width: 760px; border-collapse: collapse; }
    th, td { padding: 13px 16px; border-top: 1px solid var(--line); text-align: right; white-space: nowrap; }
    th:first-child, td:first-child, th:nth-child(2), td:nth-child(2) { text-align: left; }
    thead th { color: var(--muted); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
    tbody th { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .status { display: inline-flex; border: 1px solid currentColor; border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .status-comparable, .status-improved { color: var(--green); }
    .status-regressed { color: var(--red); }
    .status-inconclusive { color: var(--blue); }
    ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
    .finding { background: var(--panel-2); border-left: 3px solid var(--line); border-radius: 8px; padding: 13px 15px; }
    .finding-warning { border-color: var(--amber); }
    .finding-critical { border-color: var(--red); }
    .finding-improvement, .finding-pass { border-color: var(--green); }
    .finding-info { border-color: var(--blue); }
    .finding-meta { color: var(--muted); font: 700 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; margin-bottom: 4px; }
    footer { color: var(--muted); margin-top: 24px; max-width: 70ch; }
    @media (max-width: 720px) { main { padding-top: 32px; } header { align-items: start; flex-direction: column; } .revision { text-align: left; } .grid { grid-template-columns: 1fr; } }
    @media print { body { background: white; color: #111; } main { width: 100%; padding: 0; } .card, section { box-shadow: none; background: white; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div><div class="eyebrow">Counterfactual evolvability report</div><h1 class="conclusion-${report.conclusion}">${escapeHtml(report.conclusion)}</h1></div>
      <div class="revision">base ${escapeHtml(report.baseRevision.slice(0, 12))}<br>head ${escapeHtml(report.headRevision.slice(0, 12))}</div>
    </header>
    <div class="grid" aria-label="Report summary">
      <div class="card"><div class="card-label">Scenarios</div><div class="card-value">${report.summaries.length}</div></div>
      <div class="card"><div class="card-label">Comparable</div><div class="card-value">${comparableCount}</div></div>
      <div class="card"><div class="card-label">Warnings</div><div class="card-value">${warningCount}</div></div>
    </div>
    <section aria-labelledby="scenario-heading">
      <h2 id="scenario-heading">Scenario evidence</h2>
      <div class="table-wrap"><table>
        <thead><tr><th scope="col">Scenario</th><th scope="col">Status</th><th scope="col">Base success</th><th scope="col">Head success</th><th scope="col">Base files</th><th scope="col">Head files</th><th scope="col">Base churn</th><th scope="col">Head churn</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </section>
    <section aria-labelledby="finding-heading"><h2 id="finding-heading">Findings</h2><ul>${findings}</ul></section>
    <footer>EvolveCI reports evidence for maintainer-approved future-change probes. It does not predict future requirements. Generated ${escapeHtml(report.generatedAt)}.</footer>
  </main>
</body>
</html>\n`;
}
