import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runCommand } from "../src/process.js";
import { runComparison } from "../src/runner.js";
import type { CommandSpec, EvolveConfig } from "../src/types.js";
import { reportV2ValidationError } from "./report-schema-helper.js";

async function command(cwd: string, argv: CommandSpec): Promise<string> {
  const result = await runCommand({ command: argv, cwd, timeoutMs: 10_000 });
  assert.equal(result.exitCode, 0, result.stderr);
  return result.stdout.trim();
}

test("runComparison evaluates detached base and head worktrees", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "evolveci-integration-"));
  const repo = path.join(root, "repo");
  const tools = path.join(root, "tools");
  const output = path.join(root, "evidence");
  const orderLog = path.join(root, "execution-order.log");
  await mkdir(repo);
  await mkdir(tools);
  try {
    await writeFile(path.join(repo, "package.json"), '{"name":"fixture","type":"module"}\n');
    await writeFile(path.join(repo, "app.js"), 'export const value = "base";\n');
    await writeFile(
      path.join(tools, "agent.mjs"),
      `import { appendFile, writeFile } from "node:fs/promises";\n` +
        `await appendFile(${JSON.stringify(orderLog)}, process.env.EVOLVECI_SIDE + ":" + process.env.EVOLVECI_ATTEMPT + "\\n");\n` +
        `await writeFile("future.js", "export const future = true;\\n");\n` +
        `if (process.env.EVOLVECI_SIDE === "head") await writeFile("coupling.js", "export const coupled = true;\\n");\n`,
    );
    await writeFile(
      path.join(tools, "verify.mjs"),
      `import { access } from "node:fs/promises";\nif (process.env.EVOLVECI_TEST_SECRET) throw new Error("verifier inherited a secret");\nawait access("future.js");\n`,
    );
    await writeFile(
      path.join(tools, "setup.mjs"),
      `if (process.env.EVOLVECI_TEST_SECRET) throw new Error("setup inherited a secret");\n`,
    );

    await command(repo, ["git", "init", "--quiet"]);
    await command(repo, ["git", "config", "user.email", "evolveci@example.test"]);
    await command(repo, ["git", "config", "user.name", "EvolveCI Test"]);
    await command(repo, ["git", "add", "."]);
    await command(repo, ["git", "commit", "--quiet", "-m", "base"]);
    const base = await command(repo, ["git", "rev-parse", "HEAD"]);
    await writeFile(path.join(repo, "app.js"), 'export const value = "head";\n');
    await command(repo, ["git", "add", "app.js"]);
    await command(repo, ["git", "commit", "--quiet", "-m", "head"]);

    const config: EvolveConfig = {
      version: 1,
      setup: [process.execPath, path.join(tools, "setup.mjs")],
      agent: {
        command: [process.execPath, path.join(tools, "agent.mjs")],
        inheritEnvironment: false,
        passEnvironment: [],
        promptTransport: "environment",
        telemetryFormat: "none",
      },
      execution: { repetitions: 2, maxCoefficientOfVariationPercent: 10_000 },
      thresholds: {
        maxAddedFiles: 0,
        maxDurationIncreasePercent: 10_000,
        maxChurnIncreasePercent: 200,
        maxAddedTestFiles: 0,
        maxAddedDependencies: 0,
        maxChangedDependencies: 0,
        maxTokenIncreasePercent: 50,
      },
      scenarios: [
        {
          id: "future-change",
          prompt: "Implement the future change.",
          verify: [process.execPath, path.join(tools, "verify.mjs")],
        },
      ],
    };

    process.env.EVOLVECI_TEST_SECRET = "must-not-leak";
    const report = await runComparison({ repository: repo, base, head: "HEAD", config, outputDir: output }).finally(() => {
      delete process.env.EVOLVECI_TEST_SECRET;
    });
    assert.equal(report.conclusion, "warning");
    assert.equal(report.runs.length, 4);
    assert.equal(report.runs.find((run) => run.side === "base")?.metrics?.filesChanged, 1);
    assert.equal(report.runs.find((run) => run.side === "head")?.metrics?.filesChanged, 2);
    assert.equal(await readFile(orderLog, "utf8"), "base:1\nhead:1\nhead:2\nbase:2\n");
    assert.deepEqual(JSON.parse(await readFile(path.join(output, "report.json"), "utf8")), report);
    assert.match(await readFile(path.join(output, "report.md"), "utf8"), /EvolveCI: warning/);
    assert.doesNotMatch(await readFile(path.join(repo, "app.js"), "utf8"), /future/);

    const singleAttemptConfig: EvolveConfig = {
      ...config,
      execution: { ...config.execution, repetitions: 1 },
    };
    await writeFile(
      path.join(tools, "agent.mjs"),
      'import { writeFile } from "node:fs/promises";\n' +
        'if (process.env.EVOLVECI_SIDE === "base") setInterval(() => {}, 1_000);\n' +
        'else { await writeFile("future.js", "export const future = true;\\n"); await writeFile("package.json", "{invalid json\\n"); }\n',
    );
    const failureOutput = path.join(root, "failure-evidence");
    const failureReport = await runComparison({
      repository: repo,
      base,
      head: "HEAD",
      config: {
        ...singleAttemptConfig,
        scenarios: [{ ...singleAttemptConfig.scenarios[0]!, verify: [path.join(tools, "missing-verifier")], timeoutMs: 200 }],
      },
      outputDir: failureOutput,
    });
    assert.equal(failureReport.conclusion, "inconclusive");
    assert.equal(failureReport.runs.length, 2);
    const baseFailure = failureReport.runs.find((run) => run.side === "base")?.failure;
    assert.deepEqual(baseFailure && { stage: baseFailure.stage, reason: baseFailure.reason, retryable: baseFailure.retryable }, {
      stage: "agent",
      reason: "timeout",
      retryable: true,
    });
    const headFailure = failureReport.runs.find((run) => run.side === "head")?.failure;
    assert.deepEqual(headFailure && { stage: headFailure.stage, reason: headFailure.reason, retryable: headFailure.retryable }, {
      stage: "verifier",
      reason: "launch-error",
      retryable: false,
    });
    assert.equal(failureReport.runs.find((run) => run.side === "head")?.metricsError, "Change metrics could not be collected for this failed attempt.");
    const failureMarkdown = await readFile(path.join(failureOutput, "report.md"), "utf8");
    assert.match(failureMarkdown, /1 retryable \/ 0 terminal \| 0 retryable \/ 1 terminal/);
    assert.equal(failureMarkdown.match(/no automatic retry was performed/g)?.length, 2);
    assert.match(failureMarkdown, /Change metrics could not be collected/);
    assert.match(await readFile(path.join(failureOutput, "report.html"), "utf8"), /Failed attempts/);
    assert.equal(
      await reportV2ValidationError(JSON.parse(await readFile(path.join(failureOutput, "report.json"), "utf8"))),
      null,
    );
    assert.match(await readFile(path.join(failureOutput, "logs", "future-change", "head", "attempt-1", "metrics.error.log"), "utf8"), /JSON/);

    const sameEvidence = path.join(root, "same-evidence");
    await assert.rejects(
      () => runComparison({ repository: repo, base, head: base, config, outputDir: sameEvidence }),
      /base and head must resolve to different revisions/,
    );
    await assert.rejects(() => access(sameEvidence), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
