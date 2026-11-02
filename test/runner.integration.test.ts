import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runCommand } from "../src/process.js";
import { runComparison } from "../src/runner.js";
import type { CommandSpec, EvolveConfig } from "../src/types.js";

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
  await mkdir(repo);
  await mkdir(tools);
  try {
    await writeFile(path.join(repo, "package.json"), '{"name":"fixture","type":"module"}\n');
    await writeFile(path.join(repo, "app.js"), 'export const value = "base";\n');
    await writeFile(
      path.join(tools, "agent.mjs"),
      `import { writeFile } from "node:fs/promises";\n` +
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
    assert.equal(report.runs.find((run) => run.side === "base")?.metrics.filesChanged, 1);
    assert.equal(report.runs.find((run) => run.side === "head")?.metrics.filesChanged, 2);
    assert.match(await readFile(path.join(output, "report.md"), "utf8"), /EvolveCI: warning/);
    assert.doesNotMatch(await readFile(path.join(repo, "app.js"), "utf8"), /future/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
