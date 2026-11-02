import type { AgentTelemetry } from "./types.js";

interface UsageRecord {
  input_tokens?: unknown;
  cached_input_tokens?: unknown;
  cache_write_input_tokens?: unknown;
  output_tokens?: unknown;
  reasoning_output_tokens?: unknown;
}

function requiredTokenCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function optionalTokenCount(value: unknown): number | null {
  return value === undefined ? 0 : requiredTokenCount(value);
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
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      event = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
    if (event.type !== "turn.completed") continue;
    if (event.usage === null || typeof event.usage !== "object" || Array.isArray(event.usage)) return null;
    const usage = event.usage as UsageRecord;
    const inputTokens = requiredTokenCount(usage.input_tokens);
    const cachedInputTokens = optionalTokenCount(usage.cached_input_tokens);
    const cacheWriteInputTokens = optionalTokenCount(usage.cache_write_input_tokens);
    const outputTokens = requiredTokenCount(usage.output_tokens);
    const reasoningOutputTokens = optionalTokenCount(usage.reasoning_output_tokens);
    if (
      inputTokens === null ||
      cachedInputTokens === null ||
      cacheWriteInputTokens === null ||
      outputTokens === null ||
      reasoningOutputTokens === null
    ) return null;
    total.turns += 1;
    total.inputTokens += inputTokens;
    total.cachedInputTokens += cachedInputTokens;
    total.cacheWriteInputTokens += cacheWriteInputTokens;
    total.outputTokens += outputTokens;
    total.reasoningOutputTokens += reasoningOutputTokens;
  }

  if (total.turns === 0) return null;
  total.totalTokens = total.inputTokens + total.outputTokens;
  return total;
}
