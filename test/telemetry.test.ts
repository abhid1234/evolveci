import assert from "node:assert/strict";
import test from "node:test";
import { parseCodexJsonlTelemetry } from "../src/telemetry.js";

test("parseCodexJsonlTelemetry aggregates completed turns", () => {
  const output = [
    JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
    JSON.stringify({
      type: "turn.completed",
      usage: {
        input_tokens: 100,
        cached_input_tokens: 60,
        cache_write_input_tokens: 5,
        output_tokens: 20,
        reasoning_output_tokens: 8,
      },
    }),
    JSON.stringify({ type: "turn.completed", usage: { input_tokens: 50, cached_input_tokens: 0, output_tokens: 10 } }),
  ].join("\n");
  assert.deepEqual(parseCodexJsonlTelemetry(output), {
    source: "codex-jsonl",
    turns: 2,
    inputTokens: 150,
    cachedInputTokens: 60,
    cacheWriteInputTokens: 5,
    outputTokens: 30,
    reasoningOutputTokens: 8,
    totalTokens: 180,
  });
});

test("parseCodexJsonlTelemetry refuses truncated or incomplete evidence", () => {
  assert.equal(parseCodexJsonlTelemetry('{"type":"turn.completed"', false), null);
  assert.equal(
    parseCodexJsonlTelemetry('{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}', true),
    null,
  );
  assert.equal(
    parseCodexJsonlTelemetry(
      '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}\nnot-json\n',
    ),
    null,
  );
  assert.equal(
    parseCodexJsonlTelemetry('{"type":"turn.completed","usage":{"input_tokens":"1","output_tokens":1}}\n'),
    null,
  );
});
