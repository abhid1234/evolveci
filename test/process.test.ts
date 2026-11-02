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
