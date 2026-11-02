import type { AgentTelemetry } from "./types.js";

interface UsageRecord {
  input_tokens?: unknown;
  cached_input_tokens?: unknown;
  cache_write_input_tokens?: unknown;
  output_tokens?: unknown;
  reasoning_output_tokens?: unknown;
}

function tokenCount(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function parseCodexJsonlTelemetry(output: string, truncated = false): AgentTelemetry | null {
  if (truncated) return null;
  const total: AgentTelemetry = {
    source: "codex-jsonl",
    turns: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  };

  for (const line of output.split("\n")) {
    if (line.trim().length === 0) continue;
    let event: Record<string, unknown>;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      event = parsed as Record<string, unknown>;
    } catch {
      continue;
    }
    if (event.type !== "turn.completed" || event.usage === null || typeof event.usage !== "object" || Array.isArray(event.usage)) {
      continue;
    }
    const usage = event.usage as UsageRecord;
    total.turns += 1;
    total.inputTokens += tokenCount(usage.input_tokens);
    total.cachedInputTokens += tokenCount(usage.cached_input_tokens);
    total.cacheWriteInputTokens += tokenCount(usage.cache_write_input_tokens);
    total.outputTokens += tokenCount(usage.output_tokens);
    total.reasoningOutputTokens += tokenCount(usage.reasoning_output_tokens);
  }

  if (total.turns === 0) return null;
  total.totalTokens = total.inputTokens + total.outputTokens;
  return total;
}
