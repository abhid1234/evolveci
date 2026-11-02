# EvolveCI Alpha Specification

Status: executable vertical slice
Date: 2026-11-01

## Problem

Current tests and static analysis can show that a pull request works today while missing a more expensive failure mode: the new design may make an ordinary follow-up requirement touch more files, rewrite more tests, add dependencies, or fail entirely.

EvolveCI evaluates that risk by executing maintainer-approved future-change probes against two revisions under the same harness.

## Product contract

Given:

- a Git repository;
- a base and head Git reference;
- one or more repository-owned scenarios;
- an agent command and deterministic verifier;
- explicit warning thresholds;
- a repeat count and maximum acceptable run variability;

EvolveCI must:

1. resolve both references to exact commit SHAs;
2. create an isolated detached worktree for every scenario/revision pair;
3. run identical setup and agent commands with side-specific metadata in environment variables;
4. run the scenario verifier only after the agent succeeds;
5. collect patch and execution evidence before removing the worktree;
6. compare head with base per scenario;
7. aggregate repeated trials using medians and reject unstable evidence;
8. parse optional adapter telemetry only from complete structured records;
9. write human-readable reports and a versioned machine-readable report (schema version 2);
10. return a stable CI exit code.
11. classify every failed agent or verifier attempt without automatically retrying or discarding it.

## Non-goals for the alpha

- predicting which requirement will arrive next;
- grading code using a model's opinion;
- providing a security sandbox;
- supporting arbitrary shell scripts in configuration;
- calculating full statistical confidence intervals;
- publishing GitHub checks or PR comments;
- operating a hosted service.

## Fairness rules

Paired runs must use the same:

- scenario prompt;
- agent executable and arguments;
- timeout policy;
- verifier executable and arguments;
- process environment except for revision, side, and worktree metadata.

The alpha runs pairs sequentially to avoid machine contention contaminating duration. It counterbalances order deterministically: odd attempts run base then head, and even attempts run head then base. Reports use medians, expose success rates, and mark a scenario inconclusive when duration coefficient of variation exceeds the configured limit. Future versions may randomize order or parallelize pairs only when resource isolation is available.

## Result semantics

`pass` means at least one scenario produced a successful pair and no configured threshold regressed.

`warning` means a base-success/head-failure regression occurred, a run pair is missing, or a successful pair exceeded at least one configured threshold.

`inconclusive` means no scenario produced a comparable pair and no warning-class condition was found. A both-failed scenario is inconclusive, not a pass.

## Report format compatibility

Report schemas are immutable and version-addressed. `schemas/report.schema.json` remains the original schema v1 contract and `schemas/report-v2.schema.json` validates reports emitted by `0.1.0-rc.2`. Consumers should select a schema from the report's required `schemaVersion` field rather than treating an unversioned file as “latest.” Both schemas ship in the npm package so stored v1 evidence remains validatable after upgrading.

Schema v2 adds five required field groups:

- `runs[].failure`, which is `null` for a successful run and a structured failure for an unsuccessful run;
- `summaries[].base.retryableFailures` and `summaries[].head.retryableFailures`;
- `summaries[].base.terminalFailures` and `summaries[].head.terminalFailures`;
- `runs[].metrics`, which is `null` rather than zero-filled when change metrics could not be collected;
- `runs[].metricsError`, which is `null` when change metrics were collected and explains why failed-attempt metrics were unavailable otherwise.

A structured failure names the `agent` or `verifier` stage, records `timeout`, `signal`, `exit-code`, or `launch-error` as the reason, and includes a deterministic summary. Timeouts are retryable; nonzero exits are terminal. Signal and launch failures are classified from their evidence: transient termination and resource-exhaustion errors are retryable, while deterministic crashes and configuration errors are terminal. A retryable classification is evidence only: the failed attempt remains in the success rate and is never rerun automatically. Command logs are persisted before change-metric collection, so a malformed file created by a failed attempt cannot erase its process evidence.

## Failure handling

- Invalid configuration fails before worktrees are created.
- Identical resolved base and head revisions fail before output or worktrees are created.
- Setup failure aborts the run because subsequent evidence would not be comparable.
- Agent failure records evidence and skips verification.
- Verifier failure records a failed scenario.
- Agent and verifier timeouts plus transient signal or launch failures are classified as retryable; deterministic crashes, nonzero exits, and configuration-related launch errors are terminal.
- Agent and verifier launch errors are recorded as structured failures instead of aborting the comparison; retryability is derived from `launchErrorCode` evidence.
- Retryable attempts remain failed attempts in success rates and reports. The alpha never retries automatically.
- Cleanup runs in `finally` and is idempotent.
- Raw command output is persisted outside temporary worktrees.
- Repeated-run logs are stored under unique attempt directories.
- Truncated telemetry is treated as unavailable, never as zero usage.

## Trust model

Configuration is repository-owned and trusted. Agent-produced code is untrusted. The alpha prevents shell interpolation and defaults to a minimal inherited environment so unrelated credentials are not exposed. It does not isolate the process from the host network or filesystem permissions. It is appropriate for a local proof on trusted repositories, not multi-tenant execution.

## Acceptance tests

- Reject empty commands, duplicate IDs, invalid IDs, missing scenarios, and unsupported config versions.
- Kill a command that exceeds its configured timeout.
- Produce an inconclusive report when both revisions fail a probe.
- Preserve failed attempts while exposing their stage, cause, retryability, and per-side counts.
- Validate generated reports and success/failure invariants against the published Draft 2020-12 schema.
- Produce a warning when head succeeds but requires more files than configured.
- Use medians across repeated pairs and reject high-variance evidence.
- Keep undeclared parent-process secrets out of setup, agent, and verifier environments.
- Run a real temporary Git repository through base and head worktrees and write JSON, Markdown, and offline HTML reports.
- Leave the source checkout unchanged.
