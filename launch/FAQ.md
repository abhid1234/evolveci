# EvolveCI launch FAQ

Short, factual answers for launch comments, interviews, and repository issues. Do not copy the same answer repeatedly; respond to the specific question being asked.

## Is this another AI maintainability score?

No. EvolveCI does not ask a model to grade architecture. The repository defines a concrete follow-up task and deterministic verifier. The output is the paired evidence: success, changed paths, churn, tests, dependencies, duration, telemetry, failures, and raw logs.

## Does one changed file automatically mean better architecture?

No. File count is only one observable and can be misleading. A healthy change may legitimately cross several boundaries. The demo uses a deliberately constrained fixture to prove that EvolveCI can detect a known coupling difference. Real repositories should choose scenario-specific thresholds and review the patch itself.

## Are you claiming to predict the next requirement?

No. Maintainers choose plausible probes based on their own extension points, risks, and near-term design questions. EvolveCI makes that hypothesis executable; it does not infer a roadmap.

## Why use a coding agent instead of a static architecture rule?

Use a static rule when the invariant can be expressed statically. EvolveCI is for questions whose evidence is the implementation work required by a realistic change. The verifier remains deterministic, while the agent performs the patch. The two approaches can complement each other.

## Aren't agent runs too noisy for CI?

They can be. The alpha runs base and head sequentially, counterbalances pair order, summarizes repetitions with medians, exposes variability, and reports high-variance comparisons as inconclusive. This reduces obvious bias; it does not turn a small experiment into statistical proof.

## What happens when the agent or verifier fails?

The failure stays in the report. EvolveCI records the stage, reason, retryability classification, logs, and any metrics it could safely collect. It never silently retries an attempt or converts unavailable metrics into zeroes.

## Is the current runner safe for untrusted repositories?

No. Detached worktrees isolate the experimental checkout from the developer's working tree, but they are not a security sandbox. The current alpha is for trusted repositories and commands. Container or microVM isolation is a roadmap item.

## Which coding agents are supported?

The alpha has a built-in Codex adapter and a vendor-neutral command contract. Claude Code, Cursor, and Google Antigravity are intended future harness integrations, not implemented launch claims.

## Why is the demo deterministic?

To test orchestration and report semantics without spending model tokens or mixing in model variance. It is a mechanism fixture, not the public-repository validation milestone.

## What would make this production-ready?

The major milestones are stronger isolation, pinned real-agent validation on public repositories, a label-triggered CI integration, scenario-authoring guidance, caching, and a larger evidence base about which probes remain stable and useful.
