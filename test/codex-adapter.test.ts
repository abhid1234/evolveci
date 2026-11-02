import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runCodexAdapter } from "../src/adapters/codex.js";

test("Codex adapter passes the prompt on stdin with a constrained invocation", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "evolveci-codex-adapter-"));
  const fakeCodex = path.join(root, "fake-codex.mjs");
  try {
    await writeFile(
      fakeCodex,
      '#!/usr/bin/env node\nlet input = ""; for await (const chunk of process.stdin) input += chunk; process.stdout.write(JSON.stringify({ args: process.argv.slice(2), input }));\n',
    );
    await chmod(fakeCodex, 0o755);
    const result = await runCodexAdapter({
      prompt: "add the next change",
      cwd: root,
      codexBin: fakeCodex,
      model: "gpt-test",
      profile: "ci",
      timeoutMs: 5_000,
    });
    assert.equal(result.exitCode, 0);
    const output = JSON.parse(result.stdout);
    assert.deepEqual(output.args, [
      "exec",
      "--ephemeral",
      "--sandbox",
      "workspace-write",
      "--cd",
      root,
      "--color",
      "never",
      "--json",
      "--model",
      "gpt-test",
      "--profile",
      "ci",
      "-",
    ]);
    assert.equal(output.input, "add the next change");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Codex adapter rejects empty prompts and unsafe identifiers", async () => {
  await assert.rejects(() => runCodexAdapter({ prompt: "", cwd: process.cwd() }), /non-empty prompt/);
  await assert.rejects(
    () => runCodexAdapter({ prompt: "task", cwd: process.cwd(), model: "model; echo unsafe" }),
    /unsupported characters/,
  );
});
