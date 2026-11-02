# Launch fact check

Verified against `main` at `99e2cbb2183122b7b94e7a5667c1f7bf34d29619` on 2026-11-01 Pacific time.

## Safe public claims

| Claim | Evidence | Wording constraint |
|---|---|---|
| EvolveCI compares the same future-change probe on base and head revisions. | `src/runner.ts`, `docs/SPEC.md` | Say “maintainer-approved probe,” not prediction. |
| Each attempt runs in a detached Git worktree. | `src/git.ts`, integration tests | Worktrees isolate checkouts; they are not a security sandbox. |
| The deterministic demo produces a 1-file base patch and a 4-file head patch for each of three scenarios. | `npm run demo`, `demo/output/report.json` | Call it a purpose-built fixture, not a public-repo benchmark. |
| Repetitions are counterbalanced and summarized with medians. | `src/runner.ts`, `src/report.ts` | Do not claim statistical significance. |
| Failed attempts retain stage, reason, retryability, logs, and schema-validated evidence. | report schema v2 and failure tests | Retryability is descriptive; no automatic retries occur. |
| The package has a built-in Codex adapter. | `src/adapters/codex.ts` | Do not claim adapters for tools that are not implemented. |
| CI passes on Node 20, 22, 24, macOS, and Windows. | GitHub Actions run `41392669881` | Keep the run link in the launch brief. |
| Local tests pass. | 34 tests on `0.1.0-rc.2` | Update the count if tests change. |

## Public links

| Surface | URL | Current state |
|---|---|---|
| Code | https://github.com/abhid1234/evolveci | Live |
| CI proof | https://github.com/abhid1234/evolveci/actions/runs/41392669881 | Live and green |
| npm | https://www.npmjs.com/package/@avee1234/evolveci | **Pending publication; do not post yet** |
| GitHub release | https://github.com/abhid1234/evolveci/releases | **No release yet** |
| Demo / playground | TBD | **Pending** |
| Substack | TBD | **Pending** |

## Claims deliberately excluded

- No claim that EvolveCI predicts the next requirement.
- No claim that the current worktree isolation safely contains untrusted code.
- No claim of production use, hosted execution, model-cost accuracy, or broad public-repository validation.
- No claim that npm or a GitHub release is live until independent readback succeeds.
- No claim that Claude Code, Cursor, or Google Antigravity adapters exist today. The adapter contract is vendor-neutral, but only Codex is implemented.

