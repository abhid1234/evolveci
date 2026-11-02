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
  launchErrorCode: string | null;
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

export type SuccessfulCommandResult = CommandResult & {
  exitCode: 0;
  signal: null;
  timedOut: false;
  launchErrorCode: null;
};

export type SkippedVerifierResult = CommandResult & {
  command: [];
  exitCode: null;
  signal: null;
  timedOut: false;
  durationMs: 0;
  stdout: "";
  launchErrorCode: null;
};

type FailureReason = "timeout" | "signal" | "exit-code" | "launch-error";

export type RetryableSignal = "SIGHUP" | "SIGINT" | "SIGKILL" | "SIGTERM";
export type TerminalSignal = Exclude<NodeJS.Signals, RetryableSignal>;
export type RetryableLaunchErrorCode = "EAGAIN" | "EMFILE" | "ENFILE" | "ENOMEM" | "ETXTBSY";
declare const terminalLaunchErrorCodeBrand: unique symbol;
export type TerminalLaunchErrorCode = (string & { readonly [terminalLaunchErrorCodeBrand]: true }) | null;

type FailureKind =
  | { reason: "timeout"; retryable: true }
  | { reason: "signal"; retryable: true }
  | { reason: "signal"; retryable: false }
  | { reason: "exit-code"; retryable: false }
  | { reason: "launch-error"; retryable: true }
  | { reason: "launch-error"; retryable: false };

type RunFailureForStage<Stage extends "agent" | "verifier"> = {
  [Reason in FailureReason]: { stage: Stage; summary: string } & Extract<FailureKind, { reason: Reason }>;
}[FailureReason];

export type RunFailure = RunFailureForStage<"agent"> | RunFailureForStage<"verifier">;

type FailureCommandResult<Failure extends RunFailure> =
  Failure extends { reason: "timeout" } ? CommandResult & { timedOut: true; launchErrorCode: null }
    : Failure extends { reason: "signal"; retryable: true }
      ? CommandResult & { exitCode: null; signal: RetryableSignal; timedOut: false; launchErrorCode: null }
      : Failure extends { reason: "signal"; retryable: false }
        ? CommandResult & { exitCode: null; signal: TerminalSignal; timedOut: false; launchErrorCode: null }
        : Failure extends { reason: "exit-code" }
          ? CommandResult & { exitCode: number; signal: null; timedOut: false; launchErrorCode: null }
          : Failure extends { reason: "launch-error"; retryable: true }
            ? CommandResult & { exitCode: null; signal: null; timedOut: false; launchErrorCode: RetryableLaunchErrorCode }
            : CommandResult & { exitCode: null; signal: null; timedOut: false; launchErrorCode: TerminalLaunchErrorCode };

interface ScenarioRunEvidence {
  scenarioId: string;
  side: RunSide;
  attempt: number;
  revision: string;
  telemetry: AgentTelemetry | null;
}

type AvailableMetrics = { metrics: ChangeMetrics; metricsError: null };
type UnavailableMetrics = { metrics: null; metricsError: string };
type FailedRunMetrics = AvailableMetrics | UnavailableMetrics;

type FailedScenarioRun<Failure extends RunFailure> =
  ScenarioRunEvidence & FailedRunMetrics & {
    success: false;
    failure: Failure;
    agent: Failure["stage"] extends "agent" ? FailureCommandResult<Failure> : SuccessfulCommandResult;
    verifier: Failure["stage"] extends "agent" ? SkippedVerifierResult : FailureCommandResult<Failure>;
  };

type FailedScenarioRuns<Failure extends RunFailure = RunFailure> =
  Failure extends RunFailure ? FailedScenarioRun<Failure> : never;

export type ScenarioRun =
  | (ScenarioRunEvidence & AvailableMetrics & {
      success: true;
      failure: null;
      agent: SuccessfulCommandResult;
      verifier: SuccessfulCommandResult;
    })
  | FailedScenarioRuns;

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
  retryableFailures: number;
  terminalFailures: number;
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
  schemaVersion: 2;
  generatedAt: string;
  repository: string;
  baseRevision: string;
  headRevision: string;
  conclusion: Conclusion;
  findings: Finding[];
  summaries: ScenarioSummary[];
  runs: ScenarioRun[];
}
