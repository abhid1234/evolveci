import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectChangeMetrics, createWorktree, readDependencies, resolveRevision } from "./git.js";
import { classifyRunFailure } from "./failure.js";
import { CommandLaunchError, runCommand } from "./process.js";
import { evaluateRuns, renderMarkdown } from "./report.js";
import { renderHtml } from "./html.js";
import { parseCodexJsonlTelemetry } from "./telemetry.js";
import type { RunCommandOptions } from "./process.js";
import type { ChangeMetrics, ComparisonReport, CommandResult, EvolveConfig, RunSide, ScenarioConfig, ScenarioRun, SkippedVerifierResult } from "./types.js";

async function runAttemptCommand(options: RunCommandOptions): Promise<CommandResult> {
  try {
    return await runCommand(options);
  } catch (error) {
    if (!(error instanceof CommandLaunchError)) throw error;
    return {
      command: [...options.command],
      exitCode: null,
      signal: null,
      timedOut: false,
      durationMs: 0,
      stdout: "",
      stderr: error instanceof Error ? error.message : "Command could not be started.",
      stdoutTruncated: false,
      stderrTruncated: false,
      launchErrorCode: error.code ?? null,
    };
  }
}

function skippedVerifier(agent: CommandResult): SkippedVerifierResult {
  return {
    command: [],
    exitCode: null,
    signal: null,
    timedOut: false,
    durationMs: 0,
    stdout: "",
    stderr: `Verifier skipped because agent exited with ${agent.exitCode ?? agent.signal ?? "unknown status"}.`,
    stdoutTruncated: false,
    stderrTruncated: false,
    launchErrorCode: null,
  };
}

async function writeCommandLog(
  outputDir: string,
  scenarioId: string,
  side: RunSide,
  attempt: number,
  agent: CommandResult,
  verifier: CommandResult,
): Promise<string> {
  const runDir = path.join(outputDir, "logs", scenarioId, side, `attempt-${attempt}`);
  await mkdir(runDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(runDir, "agent.stdout.log"), agent.stdout),
    writeFile(path.join(runDir, "agent.stderr.log"), agent.stderr),
    writeFile(path.join(runDir, "verifier.stdout.log"), verifier.stdout),
    writeFile(path.join(runDir, "verifier.stderr.log"), verifier.stderr),
  ]);
  return runDir;
}

async function runScenario(
  repository: string,
  revision: string,
  side: RunSide,
  scenario: ScenarioConfig,
  attempt: number,
  config: EvolveConfig,
  outputDir: string,
): Promise<ScenarioRun> {
  const worktree = await createWorktree(repository, revision);
  try {
    const baseEnvironment: NodeJS.ProcessEnv = {};
    for (const name of ["PATH", "HOME", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL", "SHELL", ...config.agent.passEnvironment]) {
      if (process.env[name] !== undefined) baseEnvironment[name] = process.env[name];
    }
    const scenarioEnvironment: NodeJS.ProcessEnv = {
      ...baseEnvironment,
      EVOLVECI_SCENARIO_ID: scenario.id,
      EVOLVECI_REPOSITORY: repository,
      EVOLVECI_WORKTREE: worktree.path,
      EVOLVECI_REVISION: revision,
      EVOLVECI_SIDE: side,
      EVOLVECI_ATTEMPT: String(attempt),
    };
    if (config.setup) {
      const setup = await runCommand({
        command: config.setup,
        cwd: worktree.path,
        timeoutMs: scenario.timeoutMs ?? 300_000,
        env: scenarioEnvironment,
        inheritEnv: config.agent.inheritEnvironment,
      });
      if (setup.exitCode !== 0 || setup.timedOut) {
        const detail = setup.timedOut ? "timed out" : setup.stderr.trim() || setup.stdout.trim();
        throw new Error(`setup failed for ${scenario.id}/${side}: ${detail}`);
      }
    }
    const beforeDependencies = await readDependencies(worktree.path);
    const runEnvironment: NodeJS.ProcessEnv = {
      ...scenarioEnvironment,
      ...(config.agent.promptTransport === "environment" ? { EVOLVECI_PROMPT: scenario.prompt } : {}),
    };
    const agent = await runAttemptCommand({
      command: config.agent.command,
      cwd: worktree.path,
      timeoutMs: scenario.timeoutMs ?? config.agent.timeoutMs ?? 600_000,
      env: runEnvironment,
      inheritEnv: config.agent.inheritEnvironment,
      ...(config.agent.promptTransport === "stdin" ? { stdin: scenario.prompt } : {}),
    });
    const verifier =
      agent.exitCode === 0 && !agent.timedOut
        ? await runAttemptCommand({
            command: scenario.verify,
            cwd: worktree.path,
            timeoutMs: scenario.timeoutMs ?? 300_000,
            env: scenarioEnvironment,
            inheritEnv: config.agent.inheritEnvironment,
          })
        : skippedVerifier(agent);
    const success = agent.exitCode === 0 && verifier.exitCode === 0 && !agent.timedOut && !verifier.timedOut;
    const failure = success ? null : classifyRunFailure(agent, verifier);
    if (!success && failure === null) {
      throw new Error(`failed run for ${scenario.id}/${side}/attempt-${attempt} could not be classified`);
    }
    const runDir = await writeCommandLog(outputDir, scenario.id, side, attempt, agent, verifier);
    let metrics: ChangeMetrics | null;
    let metricsError: string | null = null;
    try {
      metrics = await collectChangeMetrics(worktree.path, beforeDependencies);
    } catch (error) {
      if (success) throw error;
      metrics = null;
      metricsError = "Change metrics could not be collected for this failed attempt.";
      await writeFile(path.join(runDir, "metrics.error.log"), error instanceof Error ? error.message : String(error));
    }
    const evidence = {
      scenarioId: scenario.id,
      side,
      attempt,
      revision,
      agent,
      verifier,
      telemetry:
        config.agent.telemetryFormat === "codex-jsonl"
          ? parseCodexJsonlTelemetry(agent.stdout, agent.stdoutTruncated)
          : null,
      metrics,
      metricsError,
    };
    const run = (success
      ? { ...evidence, success: true, failure: null }
      : { ...evidence, success: false, failure: failure! }) as ScenarioRun;
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
  if (baseRevision === headRevision) {
    throw new Error("base and head must resolve to different revisions");
  }
  await mkdir(options.outputDir, { recursive: true });

  const runs: ScenarioRun[] = [];
  for (const scenario of options.config.scenarios) {
    for (let attempt = 1; attempt <= options.config.execution.repetitions; attempt += 1) {
      const pair: Array<readonly [string, RunSide]> =
        attempt % 2 === 1
          ? [[baseRevision, "base"], [headRevision, "head"]]
          : [[headRevision, "head"], [baseRevision, "base"]];
      for (const [revision, side] of pair) {
        runs.push(await runScenario(options.repository, revision, side, scenario, attempt, options.config, options.outputDir));
      }
    }
  }

  const report = evaluateRuns(options.repository, baseRevision, headRevision, options.config, runs);
  await Promise.all([
    writeFile(path.join(options.outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`),
    writeFile(path.join(options.outputDir, "report.md"), renderMarkdown(report)),
    writeFile(path.join(options.outputDir, "report.html"), renderHtml(report)),
  ]);
  return report;
}
