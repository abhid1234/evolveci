export type CommandSpec = readonly [string, ...string[]];

export interface ScenarioConfig {
  id: string;
  prompt: string;
  verify: CommandSpec;
  timeoutMs?: number;
}

export interface ThresholdConfig {
  maxAddedFiles?: number;
  maxDurationIncreasePercent?: number;
  maxChurnIncreasePercent?: number;
  maxAddedTestFiles?: number;
  maxAddedDependencies?: number;
  maxChangedDependencies?: number;
  maxTokenIncreasePercent?: number;
}

export interface ExecutionConfig {
  repetitions?: number;
  maxCoefficientOfVariationPercent?: number;
}

export interface EvolveConfig {
  version: 1;
  setup?: CommandSpec;
  agent: {
    command: CommandSpec;
    timeoutMs?: number;
    inheritEnvironment: boolean;
    passEnvironment: string[];
    promptTransport: "environment" | "stdin";
    telemetryFormat: "none" | "codex-jsonl";
  };
  execution: Required<ExecutionConfig>;
  thresholds: Required<ThresholdConfig>;
  scenarios: ScenarioConfig[];
}

export type RunSide = "base" | "head";

export interface CommandResult {
  command: string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
}

export interface ChangeMetrics {
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  churn: number;
  testFilesChanged: number;
  dependenciesAdded: string[];
  dependenciesChanged: string[];
  changedPaths: string[];
}

export interface AgentTelemetry {
  source: "codex-jsonl";
  turns: number;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
}

export interface ScenarioRun {
  scenarioId: string;
  side: RunSide;
  attempt: number;
  revision: string;
  success: boolean;
  agent: CommandResult;
  verifier: CommandResult | null;
  telemetry: AgentTelemetry | null;
  metrics: ChangeMetrics;
}

export type FindingSeverity = "improvement" | "info" | "warning" | "critical";

export interface Finding {
  scenarioId: string;
  severity: FindingSeverity;
  metric: string;
  message: string;
  baseValue?: number | boolean;
  headValue?: number | boolean;
}

export type Conclusion = "pass" | "warning" | "inconclusive";

export interface MetricSummary {
  successRate: number;
  medianDurationMs: number | null;
  medianFilesChanged: number | null;
  medianChurn: number | null;
  medianTestFilesChanged: number | null;
  medianDependenciesAdded: number | null;
  medianDependenciesChanged: number | null;
  durationCoefficientOfVariationPercent: number | null;
  medianTotalTokens: number | null;
}

export interface ScenarioSummary {
  scenarioId: string;
  status: "comparable" | "improved" | "regressed" | "inconclusive";
  base: MetricSummary;
  head: MetricSummary;
}

export interface ComparisonReport {
  schemaVersion: 1;
  generatedAt: string;
  repository: string;
  baseRevision: string;
  headRevision: string;
  conclusion: Conclusion;
  findings: Finding[];
  summaries: ScenarioSummary[];
  runs: ScenarioRun[];
}
