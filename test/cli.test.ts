import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { runCommand } from "../src/process.js";

const cli = path.resolve("dist/src/cli.js");

test("CLI rejects unknown options before touching a repository", async () => {
  const result = await runCommand({
    command: [process.execPath, cli, "validate", "--reop", "."],
    cwd: process.cwd(),
    timeoutMs: 5_000,
  });
  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /unknown option.*--reop/);
});

test("CLI rejects duplicate options", async () => {
  const result = await runCommand({
    command: [process.execPath, cli, "run", "--base", "main", "--base", "HEAD", "--head", "HEAD"],
    cwd: process.cwd(),
    timeoutMs: 5_000,
  });
  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /duplicate option: --base/);
});
