import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectChangeMetrics, createWorktree, readDependencies, resolveRevision } from "./git.js";
import { runCommand } from "./process.js";
import { evaluateRuns, renderMarkdown } from "./report.js";
import type { ComparisonReport, CommandResult, EvolveConfig, RunSide, ScenarioConfig, ScenarioRun } from "./types.js";

function skippedVerifier(agent: CommandResult): CommandResult {
  return {
    command: [],
    exitCode: null,
    signal: null,
    timedOut: false,
    durationMs: 0,
    stdout: "",
    stderr: `Verifier skipped because agent exited with ${agent.exitCode ?? agent.signal ?? "unknown status"}.`,
  };
}

async function writeCommandLog(outputDir: string, run: ScenarioRun): Promise<void> {
  const runDir = path.join(outputDir, "logs", run.scenarioId, run.side);
  await mkdir(runDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(runDir, "agent.stdout.log"), run.agent.stdout),
    writeFile(path.join(runDir, "agent.stderr.log"), run.agent.stderr),
    writeFile(path.join(runDir, "verifier.stdout.log"), run.verifier?.stdout ?? ""),
    writeFile(path.join(runDir, "verifier.stderr.log"), run.verifier?.stderr ?? ""),
  ]);
}

async function runScenario(
  repository: string,
  revision: string,
  side: RunSide,
  scenario: ScenarioConfig,
  config: EvolveConfig,
  outputDir: string,
): Promise<ScenarioRun> {
  const worktree = await createWorktree(repository, revision);
  try {
    if (config.setup) {
      const setup = await runCommand({ command: config.setup, cwd: worktree.path, timeoutMs: scenario.timeoutMs ?? 300_000 });
      if (setup.exitCode !== 0) {
        throw new Error(`setup failed for ${scenario.id}/${side}: ${setup.stderr.trim() || setup.stdout.trim()}`);
      }
    }
    const beforeDependencies = await readDependencies(worktree.path);
    const agent = await runCommand({
      command: config.agent.command,
      cwd: worktree.path,
      timeoutMs: scenario.timeoutMs ?? config.agent.timeoutMs ?? 600_000,
      env: {
        EVOLVECI_SCENARIO_ID: scenario.id,
        EVOLVECI_PROMPT: scenario.prompt,
        EVOLVECI_REPOSITORY: repository,
        EVOLVECI_WORKTREE: worktree.path,
        EVOLVECI_REVISION: revision,
        EVOLVECI_SIDE: side,
      },
    });
    const verifier =
      agent.exitCode === 0
        ? await runCommand({ command: scenario.verify, cwd: worktree.path, timeoutMs: scenario.timeoutMs ?? 300_000 })
        : skippedVerifier(agent);
    const run: ScenarioRun = {
      scenarioId: scenario.id,
      side,
      revision,
      success: agent.exitCode === 0 && verifier.exitCode === 0 && !agent.timedOut && !verifier.timedOut,
      agent,
      verifier,
      metrics: await collectChangeMetrics(worktree.path, beforeDependencies),
    };
    await writeCommandLog(outputDir, run);
    return run;
  } finally {
    await worktree.dispose();
  }
}

export interface ComparisonOptions {
  repository: string;
  base: string;
  head: string;
  config: EvolveConfig;
  outputDir: string;
}

export async function runComparison(options: ComparisonOptions): Promise<ComparisonReport> {
  const baseRevision = await resolveRevision(options.repository, options.base);
  const headRevision = await resolveRevision(options.repository, options.head);
  await mkdir(options.outputDir, { recursive: true });

  const runs: ScenarioRun[] = [];
  for (const scenario of options.config.scenarios) {
    runs.push(await runScenario(options.repository, baseRevision, "base", scenario, options.config, options.outputDir));
    runs.push(await runScenario(options.repository, headRevision, "head", scenario, options.config, options.outputDir));
  }

  const report = evaluateRuns(options.repository, baseRevision, headRevision, options.config, runs);
  await Promise.all([
    writeFile(path.join(options.outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`),
    writeFile(path.join(options.outputDir, "report.md"), renderMarkdown(report)),
  ]);
  return report;
}
