# Implementation Plan

## Milestone 1 — executable paired runner

- [x] Define schema and stable result types.
- [x] Parse and validate YAML without accepting shell strings.
- [x] Add bounded, timeout-aware command execution.
- [x] Add exact-ref resolution and detached worktree lifecycle.
- [x] Collect patch, test-file, and dependency metrics.
- [x] Evaluate per-scenario threshold deltas.
- [x] Render JSON, Markdown, and offline HTML evidence.
- [x] Expose `validate` and `run` CLI commands.
- [x] Complete clean-install and integration verification.

## Milestone 2 — compelling demo

- [x] Create a small permissions fixture repository.
- [x] Add boundary-preserving base and tightly coupled head revisions.
- [x] Add a protected auditor-role follow-up verifier.
- [ ] Expand the fixture to multi-tenancy, billing, and audit logging.
- [x] Add two more protected follow-up verifiers.
- [x] Run each scenario three times with a deterministic fixture adapter.
- [x] Produce a screenshot-ready offline HTML view.
- [ ] Check in an anonymized sample report after public repository naming is final.

## Milestone 3 — credible agent execution

- [x] Define a subprocess adapter protocol with prompt and run metadata.
- [x] Add a constrained Codex CLI adapter.
- [x] Add normalized Codex token and turn telemetry.
- [ ] Add cost estimates only after model identity and pricing can be verified.
- [ ] Add a Claude Code adapter.
- [x] Add run repetition, counterbalanced pair ordering, medians, dispersion, and confidence-based inconclusive results.
- [x] Add retry classification without hiding failures or automatically rerunning attempts.

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
