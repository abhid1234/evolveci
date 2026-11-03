# EvolveCI launch brief

## One sentence

EvolveCI runs the same maintainer-chosen follow-up task on the base and head of a pull request, then shows whether the head made that next change measurably harder.

## The hook

**Your pull request passes. What did it do to the next change?**

Conventional CI tests current behavior. EvolveCI adds a narrow counterfactual experiment: apply one plausible future change to both revisions, verify it deterministically, and compare the resulting evidence.

## Why it matters

Some structural regressions do not break current tests. They move a rule from one registry into four coupled locations, turn a boundary into a special case, or duplicate a source of truth. The bill arrives in the next pull request. EvolveCI makes one such architectural hunch executable and reviewable.

## The proof to show

The deterministic permissions fixture preserves identical current behavior on both revisions. Across three role-addition scenarios:

- base: **1 changed file**;
- head: **4 changed files**;
- result: warning with the task, verifier, paths, churn, and raw logs attached.

This is a mechanism demonstration, not a general benchmark. Do not imply that four files are always worse than one.

## Who it is for

- maintainers reviewing structural refactors;
- platform teams experimenting with coding agents in CI;
- library authors protecting extension points;
- researchers interested in executable, repository-owned evaluation tasks.

## Product truth

- Executable open-source alpha, not a hosted product.
- Built-in Codex adapter today; vendor-neutral adapter contract.
- Repository owners choose prompts, verifiers, thresholds, and repetitions.
- Worktrees isolate checkouts but are not a security sandbox.
- Failure remains evidence; the tool never silently retries an attempt.
- No opaque maintainability score and no claim to predict a roadmap.

## Primary launch assets

1. The 66-second video for X, LinkedIn, and the Substack header.
2. The 1-vs-4 figure for the concrete proof.
3. The deep-dive essay for the mechanism, fairness choices, and limitations.
4. The repository demo for readers who want to reproduce the claim.

## Launch gate

Do not post until the three unpublished public surfaces are independently verified: npm registry, GitHub release, and published Substack URL. The deterministic demo already has a canonical repository destination. Current status is maintained in [`FACT-CHECK.md`](FACT-CHECK.md).
