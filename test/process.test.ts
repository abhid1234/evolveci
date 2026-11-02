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
