import assert from "node:assert/strict";
import test from "node:test";
import { runCommand } from "../src/process.js";

test("runCommand captures output without a shell", async () => {
  const result = await runCommand({
    command: [process.execPath, "-e", 'process.stdout.write("ok")'],
    cwd: process.cwd(),
    timeoutMs: 5_000,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "ok");
  assert.equal(result.timedOut, false);
});

test("runCommand terminates timed-out processes", async () => {
  const result = await runCommand({
    command: [process.execPath, "-e", "setTimeout(() => {}, 60_000)"],
    cwd: process.cwd(),
    timeoutMs: 25,
  });
  assert.equal(result.timedOut, true);
  assert.notEqual(result.exitCode, 0);
});

test("runCommand cleans up descendant processes on POSIX", { skip: process.platform === "win32" }, async () => {
  const result = await runCommand({
    command: [
      process.execPath,
      "-e",
      'const { spawn } = require("node:child_process"); const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { stdio: "ignore" }); child.unref(); process.stdout.write(String(child.pid));',
    ],
    cwd: process.cwd(),
    timeoutMs: 5_000,
  });
  assert.equal(result.exitCode, 0);
  const descendantPid = Number.parseInt(result.stdout, 10);
  assert(Number.isSafeInteger(descendantPid));

  let alive = true;
  for (let attempt = 0; attempt < 20 && alive; attempt += 1) {
    try {
      process.kill(descendantPid, 0);
      await new Promise((resolve) => setTimeout(resolve, 10));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      alive = false;
    }
  }
  assert.equal(alive, false, `descendant process ${descendantPid} survived command completion`);
});

test("runCommand can pass prompts over stdin without inheriting secrets", async () => {
  const result = await runCommand({
    command: [
      process.execPath,
      "-e",
      'let input=""; process.stdin.on("data", chunk => input += chunk); process.stdin.on("end", () => process.stdout.write(`${input}|${process.env.EVOLVECI_TEST_SECRET ?? "missing"}`));',
    ],
    cwd: process.cwd(),
    stdin: "future change",
    inheritEnv: false,
    env: { PATH: process.env.PATH },
    timeoutMs: 5_000,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "future change|missing");
});
