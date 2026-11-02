# Changelog

All notable changes to EvolveCI are documented here. The format follows Keep a Changelog and versions follow Semantic Versioning.

## [0.1.0-rc.2] - 2026-11-01

### Added

- Failed agent and verifier attempts now expose stage, cause, retryability, per-side counts, and a no-retry ledger in JSON, Markdown, and offline HTML reports.
- Immutable schema v2 validation with reason-specific invariants, preserved schema v1 support, and migration documentation.

### Changed

- Missing executables are recorded as terminal launch failures instead of aborting a comparison.
- Command logs are persisted before metric analysis, and failed attempts use `null` metrics plus explicit error evidence when their output cannot be analyzed.
- Retryability separates transient termination or resource-exhaustion failures from deterministic crashes and configuration errors.
- Offline reports now spell out failure classifications, surface failed-attempt totals, and keep scenario context visible in wide tables.

## [0.1.0-rc.1] - 2026-11-01

### Added

- Paired base/head execution in disposable detached Git worktrees.
- Repository-owned YAML scenarios with strict unknown-key rejection.
- Repeated trials, median metrics, success rates, and variance-based inconclusive results.
- File, churn, test-change, dependency-addition, and dependency-version evidence.
- Safe argv execution, stdin prompt transport, environment allowlisting, timeouts, and bounded logs.
- Built-in ephemeral Codex CLI adapter and documented vendor-neutral adapter contract.
- Exact Codex completed-turn token telemetry with median token-delta thresholds.
- JSON, Markdown, and dependency-free offline HTML reports.
- Deterministic three-scenario demo with protected verifiers.
- CI, trusted-publisher release workflow, package validation, and release documentation.
- Clean-consumer smoke testing of the exact npm tarball.

### Changed

- Setup, agent, and verifier commands now share the same default-deny environment policy.
- POSIX command execution now terminates descendant process groups on timeout and completion.
- Codex JSONL outcomes and token telemetry fail closed when terminal or usage evidence is incomplete.
- Release automation is idempotent, selects `next` for prereleases, verifies registry readback, and tests macOS and Windows compatibility.
- Repeated pairs now alternate base/head execution order to reduce systematic warm-cache and machine-order bias.
- Same-revision comparisons now fail closed before creating evidence output or detached worktrees.

[0.1.0-rc.2]: https://github.com/abhid1234/evolveci/releases/tag/v0.1.0-rc.2
[0.1.0-rc.1]: https://github.com/abhid1234/evolveci/releases/tag/v0.1.0-rc.1
