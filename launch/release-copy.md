# GitHub release copy

Published for `v0.1.0` on 2026-11-03 PT after confirming the version and tag against `package.json`, `package-lock.json`, `src/version.ts`, and `CHANGELOG.md`. Public release: https://github.com/abhid1234/evolveci/releases/tag/v0.1.0

## Suggested title

`v0.1.0 — executable alpha for counterfactual CI`

## Suggested body

EvolveCI tests a narrow question that conventional CI cannot answer: **did this pull request make one plausible next change harder?**

A repository defines a future-change prompt, deterministic verifier, repetitions, and thresholds. EvolveCI runs the same probe against exact base and head commits in detached Git worktrees, then preserves the paired evidence.

### Included in this release

- base/head scenario execution with counterbalanced repeated pairs;
- median and duration-variability reporting;
- changed-file, churn, test-file, and dependency metrics;
- explicit retryable-versus-terminal failure classification without automatic retries;
- versioned JSON, Markdown, and self-contained HTML reports;
- bounded raw logs and nullable metrics when evidence cannot be collected;
- built-in Codex adapter with completed-turn token telemetry;
- deterministic three-scenario demo showing a 1-file base patch versus a 4-file head patch;
- Node 20, 22, and 24 CI plus macOS and Windows smoke coverage.

### Release assurance

- The attached `.tgz` is the exact npm package tarball produced from this release tag.
- The attached `sbom.cdx.json` is a CycloneDX software bill of materials generated from the same checkout.
- The release workflow independently reads `@avee1234/evolveci@0.1.0` back from the public npm registry before uploading either asset.

### Important boundaries

- Scenarios are maintainer-chosen experiments, not predictions of the roadmap.
- The deterministic fixture proves the comparison mechanism, not general maintainability.
- Detached worktrees isolate checkouts; they are not a security sandbox.
- Only the Codex adapter is built in today.

### Try the demo

```bash
git clone https://github.com/abhid1234/evolveci
cd evolveci
npm install
npm run demo
```

The evidence bundle is written to `demo/output/`.

**Full changelog:** https://github.com/abhid1234/evolveci/blob/main/CHANGELOG.md
