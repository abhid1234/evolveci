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

EvolveCI must:

1. resolve both references to exact commit SHAs;
2. create an isolated detached worktree for every scenario/revision pair;
3. run identical setup and agent commands with side-specific metadata in environment variables;
4. run the scenario verifier only after the agent succeeds;
5. collect patch and execution evidence before removing the worktree;
6. compare head with base per scenario;
7. write human-readable and machine-readable reports;
8. return a stable CI exit code.

## Non-goals for the alpha

- predicting which requirement will arrive next;
- grading code using a model's opinion;
- providing a security sandbox;
- supporting arbitrary shell scripts in configuration;
- running repetitions or calculating confidence intervals;
- publishing GitHub checks or PR comments;
- operating a hosted service.

## Fairness rules

Paired runs must use the same:

- scenario prompt;
- agent executable and arguments;
- timeout policy;
- verifier executable and arguments;
- process environment except for revision, side, and worktree metadata.

The alpha runs pairs sequentially to avoid machine contention contaminating duration. Future versions may parallelize pairs only when resource isolation is available.

## Result semantics

`pass` means at least one scenario produced a successful pair and no configured threshold regressed.

`warning` means a base-success/head-failure regression occurred, a run pair is missing, or a successful pair exceeded at least one configured threshold.

`inconclusive` means no scenario produced a comparable pair and no warning-class condition was found. A both-failed scenario is inconclusive, not a pass.

## Failure handling

- Invalid configuration fails before worktrees are created.
- Setup failure aborts the run because subsequent evidence would not be comparable.
- Agent failure records evidence and skips verification.
- Verifier failure records a failed scenario.
- Cleanup runs in `finally` and is idempotent.
- Raw command output is persisted outside temporary worktrees.

## Trust model

Configuration is repository-owned and trusted. Agent-produced code is untrusted. The alpha prevents shell interpolation but does not isolate the process from the host network or filesystem permissions. It is appropriate for a local proof on trusted repositories, not multi-tenant execution.

## Acceptance tests

- Reject empty commands, duplicate IDs, invalid IDs, missing scenarios, and unsupported config versions.
- Kill a command that exceeds its configured timeout.
- Produce an inconclusive report when both revisions fail a probe.
- Produce a warning when head succeeds but requires more files than configured.
- Run a real temporary Git repository through base and head worktrees and write both report formats.
- Leave the source checkout unchanged.
