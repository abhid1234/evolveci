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
      '#!/usr/bin/env node\nlet input = ""; for await (const chunk of process.stdin) input += chunk; process.stdout.write(JSON.stringify({ type: "thread.started", args: process.argv.slice(2), input }) + "\\n" + JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } }) + "\\n");\n',
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
    const output = JSON.parse(result.stdout.split("\n")[0] ?? "");
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

test("Codex adapter fails closed on terminal failures and incomplete JSONL", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "evolveci-codex-outcome-"));
  try {
    for (const [name, output, expected] of [
      ["failed", '{"type":"turn.failed"}\n', /turn\.failed/],
      ["incomplete", '{"type":"thread.started"}\n', /no completed turn/],
      ["malformed", 'not-json\n', /malformed event/],
    ] as const) {
      const fakeCodex = path.join(root, `${name}.mjs`);
      await writeFile(fakeCodex, `#!/usr/bin/env node\nprocess.stdout.write(${JSON.stringify(output)});\n`);
      await chmod(fakeCodex, 0o755);
      const result = await runCodexAdapter({ prompt: "task", cwd: root, codexBin: fakeCodex });
      assert.equal(result.exitCode, 1);
      assert.match(result.stderr, expected);
    }
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
