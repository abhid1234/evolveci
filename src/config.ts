import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { CommandSpec, EvolveConfig, ScenarioConfig, ThresholdConfig } from "./types.js";

const DEFAULT_THRESHOLDS: Required<ThresholdConfig> = {
  maxAddedFiles: 2,
  maxDurationIncreasePercent: 50,
  maxChurnIncreasePercent: 50,
  maxAddedTestFiles: 0,
  maxAddedDependencies: 0,
  maxChangedDependencies: 0,
  maxTokenIncreasePercent: 50,
};

const DEFAULT_EXECUTION = {
  repetitions: 1,
  maxCoefficientOfVariationPercent: 30,
} as const;

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertKnownKeys(object: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const unknown = Object.keys(object).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw new Error(`${label} contains unknown key(s): ${unknown.join(", ")}`);
}

function asCommand(value: unknown, label: string): CommandSpec {
  if (!Array.isArray(value) || value.length === 0 || value.some((part) => typeof part !== "string" || part.length === 0)) {
    throw new Error(`${label} must be a non-empty array of non-empty strings`);
  }
  return value as unknown as CommandSpec;
}

function optionalPositiveInteger(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value as number;
}

function threshold(value: unknown, label: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return value;
}

function parseScenario(value: unknown, index: number): ScenarioConfig {
  const object = asObject(value, `scenarios[${index}]`);
  assertKnownKeys(object, ["id", "prompt", "verify", "timeoutMs"], `scenarios[${index}]`);
  const { id, prompt } = object;
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new Error(`scenarios[${index}].id must use lowercase letters, numbers, and hyphens`);
  }
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error(`scenarios[${index}].prompt must be a non-empty string`);
  }
  const timeoutMs = optionalPositiveInteger(object.timeoutMs, `scenarios[${index}].timeoutMs`);
  return {
    id,
    prompt: prompt.trim(),
    verify: asCommand(object.verify, `scenarios[${index}].verify`),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  };
}

export function parseConfig(input: string): EvolveConfig {
  const raw = asObject(parse(input), "config");
  assertKnownKeys(raw, ["version", "setup", "agent", "execution", "thresholds", "scenarios"], "config");
  if (raw.version !== 1) throw new Error("config.version must be 1");

  const agent = asObject(raw.agent, "config.agent");
  assertKnownKeys(agent, ["command", "timeoutMs", "inheritEnvironment", "passEnvironment", "promptTransport", "telemetryFormat"], "config.agent");
  const timeoutMs = optionalPositiveInteger(agent.timeoutMs, "config.agent.timeoutMs");
  const inheritEnvironment = agent.inheritEnvironment ?? false;
  if (typeof inheritEnvironment !== "boolean") {
    throw new Error("config.agent.inheritEnvironment must be a boolean");
  }
  const promptTransport = agent.promptTransport ?? "environment";
  if (promptTransport !== "environment" && promptTransport !== "stdin") {
    throw new Error('config.agent.promptTransport must be "environment" or "stdin"');
  }
  const telemetryFormat = agent.telemetryFormat ?? "none";
  if (telemetryFormat !== "none" && telemetryFormat !== "codex-jsonl") {
    throw new Error('config.agent.telemetryFormat must be "none" or "codex-jsonl"');
  }
  const passEnvironment = agent.passEnvironment ?? [];
  if (!Array.isArray(passEnvironment) || passEnvironment.some((name) => typeof name !== "string" || !/^[A-Z_][A-Z0-9_]*$/.test(name))) {
    throw new Error("config.agent.passEnvironment must be an array of environment variable names");
  }
  if (!Array.isArray(raw.scenarios) || raw.scenarios.length === 0) {
    throw new Error("config.scenarios must contain at least one scenario");
  }

  const scenarios = raw.scenarios.map(parseScenario);
  const ids = new Set<string>();
  for (const scenario of scenarios) {
    if (ids.has(scenario.id)) throw new Error(`duplicate scenario id: ${scenario.id}`);
    ids.add(scenario.id);
  }

  const thresholds = raw.thresholds === undefined ? {} : asObject(raw.thresholds, "config.thresholds");
  const execution = raw.execution === undefined ? {} : asObject(raw.execution, "config.execution");
  assertKnownKeys(execution, ["repetitions", "maxCoefficientOfVariationPercent"], "config.execution");
  assertKnownKeys(
    thresholds,
    [
      "maxAddedFiles",
      "maxDurationIncreasePercent",
      "maxChurnIncreasePercent",
      "maxAddedTestFiles",
      "maxAddedDependencies",
      "maxChangedDependencies",
      "maxTokenIncreasePercent",
    ],
    "config.thresholds",
  );
  const repetitions = optionalPositiveInteger(execution.repetitions, "config.execution.repetitions") ?? DEFAULT_EXECUTION.repetitions;
  if (repetitions > 20) throw new Error("config.execution.repetitions must not exceed 20");
  const parsed: EvolveConfig = {
    version: 1,
    agent: {
      command: asCommand(agent.command, "config.agent.command"),
      inheritEnvironment,
      passEnvironment: [...passEnvironment] as string[],
      promptTransport,
      telemetryFormat,
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
    },
    execution: {
      repetitions,
      maxCoefficientOfVariationPercent: threshold(
        execution.maxCoefficientOfVariationPercent,
        "config.execution.maxCoefficientOfVariationPercent",
        DEFAULT_EXECUTION.maxCoefficientOfVariationPercent,
      ),
    },
    thresholds: {
      maxAddedFiles: threshold(thresholds.maxAddedFiles, "config.thresholds.maxAddedFiles", DEFAULT_THRESHOLDS.maxAddedFiles),
      maxDurationIncreasePercent: threshold(
        thresholds.maxDurationIncreasePercent,
        "config.thresholds.maxDurationIncreasePercent",
        DEFAULT_THRESHOLDS.maxDurationIncreasePercent,
      ),
      maxChurnIncreasePercent: threshold(
        thresholds.maxChurnIncreasePercent,
        "config.thresholds.maxChurnIncreasePercent",
        DEFAULT_THRESHOLDS.maxChurnIncreasePercent,
      ),
      maxAddedTestFiles: threshold(
        thresholds.maxAddedTestFiles,
        "config.thresholds.maxAddedTestFiles",
        DEFAULT_THRESHOLDS.maxAddedTestFiles,
      ),
      maxAddedDependencies: threshold(
        thresholds.maxAddedDependencies,
        "config.thresholds.maxAddedDependencies",
        DEFAULT_THRESHOLDS.maxAddedDependencies,
      ),
      maxChangedDependencies: threshold(
        thresholds.maxChangedDependencies,
        "config.thresholds.maxChangedDependencies",
        DEFAULT_THRESHOLDS.maxChangedDependencies,
      ),
      maxTokenIncreasePercent: threshold(
        thresholds.maxTokenIncreasePercent,
        "config.thresholds.maxTokenIncreasePercent",
        DEFAULT_THRESHOLDS.maxTokenIncreasePercent,
      ),
    },
    scenarios,
  };
  if (raw.setup !== undefined) parsed.setup = asCommand(raw.setup, "config.setup");
  return parsed;
}

export async function loadConfig(path: string): Promise<EvolveConfig> {
  return parseConfig(await readFile(path, "utf8"));
}
