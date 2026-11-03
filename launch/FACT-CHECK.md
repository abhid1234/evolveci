# Launch fact check

Product claims and release surfaces were reverified from `main` at `e1b5f74145196d259a02933e56defccebc7bd228` on 2026-11-03 Pacific time. Public claims below are backed by exact-SHA CI, registry readback, a clean install, or a signed-out public URL as noted.

## Safe public claims

| Claim | Evidence | Wording constraint |
|---|---|---|
| EvolveCI compares the same future-change probe on base and head revisions. | `src/runner.ts`, `docs/SPEC.md` | Say “maintainer-approved probe,” not prediction. |
| Each attempt runs in a detached Git worktree. | `src/git.ts`, integration tests | Worktrees isolate checkouts; they are not a security sandbox. |
| The deterministic demo produces a 1-file base patch and a 4-file head patch for each of three scenarios. | `npm run demo`, `demo/output/report.json` | Call it a purpose-built fixture, not a public-repo benchmark. |
| Repetitions are counterbalanced and summarized with medians. | `src/runner.ts`, `src/report.ts` | Do not claim statistical significance. |
| Failed attempts retain stage, reason, retryability, logs, and schema-validated evidence. | report schema v2 and failure tests | Retryability is descriptive; no automatic retries occur. |
| The package has a built-in Codex adapter. | `src/adapters/codex.ts` | Do not claim adapters for tools that are not implemented. |
| CI passes on Node 20, 22, 24, macOS, and Windows. | Exact-main run `41704091228` on release SHA `e1b5f74145196d259a02933e56defccebc7bd228` | Keep the exact run link with the release evidence. |
| Local tests pass. | 34 tests on `0.1.0` | Update the count if tests change. |

## Public links

| Surface | URL | Current state |
|---|---|---|
| Code | https://github.com/abhid1234/evolveci | LIVE_VERIFIED: repository reachable |
| CI proof | https://github.com/abhid1234/evolveci/actions/runs/41704091228 | LIVE_VERIFIED: exact release SHA green on Node 20/22/24, macOS, and Windows |
| npm | https://www.npmjs.com/package/@avee1234/evolveci | LIVE_VERIFIED: registry returned `@avee1234/evolveci@0.1.0`; clean install reported `0.1.0` on 2026-11-03 PT |
| GitHub release | https://github.com/abhid1234/evolveci/releases/tag/v0.1.0 | LIVE_VERIFIED: tag targets the release SHA; tarball and CycloneDX SBOM attached by release run `41705018178` |
| Demo / playground | https://github.com/abhid1234/evolveci#run-the-deterministic-demo | LIVE_VERIFIED: repository demo instructions reachable |
| Substack | TBD | **Pending** |

## Claims deliberately excluded

- No claim that EvolveCI predicts the next requirement.
- No claim that the current worktree isolation safely contains untrusted code.
- No claim of production use, hosted execution, model-cost accuracy, or broad public-repository validation.
- No claim that a future npm version or GitHub release is live until its own independent readback succeeds.
- No claim that Claude Code, Cursor, or Google Antigravity adapters exist today. The adapter contract is vendor-neutral, but only Codex is implemented.
