# Implementation Plan

## Milestone 1 — executable paired runner

- [x] Define schema and stable result types.
- [x] Parse and validate YAML without accepting shell strings.
- [x] Add bounded, timeout-aware command execution.
- [x] Add exact-ref resolution and detached worktree lifecycle.
- [x] Collect patch, test-file, and dependency metrics.
- [x] Evaluate per-scenario threshold deltas.
- [x] Render JSON and Markdown evidence.
- [x] Expose `validate` and `run` CLI commands.
- [x] Complete clean-install and integration verification.

## Milestone 2 — compelling demo

- [x] Create a small permissions fixture repository.
- [x] Add boundary-preserving base and tightly coupled head revisions.
- [x] Add a protected auditor-role follow-up verifier.
- [ ] Expand the fixture to multi-tenancy, billing, and audit logging.
- [ ] Add two more protected follow-up verifiers.
- [ ] Run each scenario three times with a deterministic fixture adapter.
- [ ] Produce a checked-in anonymized sample report and screenshot-ready HTML view.

## Milestone 3 — credible agent execution

- [ ] Define an adapter protocol with prompt, token, turn, and cost telemetry.
- [ ] Add a Codex CLI adapter.
- [ ] Add a Claude Code adapter.
- [ ] Add run repetition, medians, dispersion, and confidence-based inconclusive results.
- [ ] Add retry classification without hiding failures.

## Milestone 4 — isolation and CI

- [ ] Add Docker runner with CPU, memory, network, and timeout policies.
- [ ] Cache setup layers by lockfile and toolchain fingerprint.
- [ ] Add a GitHub Action with label-triggered execution.
- [ ] Upload evidence as an artifact and publish a check summary.
- [ ] Add concurrency cancellation for superseded commits.

## Promotion gate

Do not build a hosted service until:

- the demo reliably separates the good and bad implementation;
- repeated paired deltas remain within a 20% variance budget;
- a three-scenario run stays under the agreed time and model-cost budget;
- at least three external teams run the local prototype;
- reviewers prefer the executable evidence to an ordinary static score.
