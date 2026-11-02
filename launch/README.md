# EvolveCI launch kit

This directory is the source of truth for EvolveCI launch materials. It is intentionally split into copy, visuals, and production assets so a public claim can be checked before it is posted.

## Deliverables

| Artifact | Purpose | Status |
|---|---|---|
| [`blog-evolveci.md`](blog-evolveci.md) | Canonical Substack essay source | Ready for editorial review |
| [`blog-evolveci-substack.html`](blog-evolveci-substack.html) | One-paste Substack HTML with three embedded figures | Ready |
| [`launch-posts.md`](launch-posts.md) | X, LinkedIn, HN, Reddit, and Product Hunt copy | Ready for editorial review |
| [`launch-evolveci.html`](launch-evolveci.html) | Copy-friendly launch control room | Ready |
| [`FACT-CHECK.md`](FACT-CHECK.md) | Claim ledger and public-surface readiness | Ready |
| [`LAUNCH-BRIEF.md`](LAUNCH-BRIEF.md) | One-page positioning, proof, audience, and launch gate | Ready |
| [`demo-script.md`](demo-script.md) | Two-minute terminal demo run-of-show | Ready |
| [`release-copy.md`](release-copy.md) | Draft GitHub release title and notes | Ready |
| [`FAQ.md`](FAQ.md) | Accurate answers for launch comments and objections | Ready |
| [`ACCESSIBILITY.md`](ACCESSIBILITY.md) | Figure alt text, video description, and caption checks | Ready |
| [`PUBLISHING-RUNBOOK.md`](PUBLISHING-RUNBOOK.md) | Exact morning publish order and independent readbacks | Ready |
| [`figures/`](figures/) | Five light-theme launch figures and 1100×220 banner | Rendered and visually verified |
| [`video/`](video/) | Script, deterministic animation, captions, narration, render pipeline, and 66-second MP4 | Rendered and verified |

## Launch sequence

1. Merge the launch-material PR after CI passes.
2. Publish `@avee1234/evolveci` through the existing trusted-publisher release workflow.
3. Verify the npm registry response independently.
4. Create or confirm the public demo URL.
5. Replace the two pending links identified in [`FACT-CHECK.md`](FACT-CHECK.md).
6. Paste `blog-evolveci-substack.html` into Substack, upload the video, and verify every public link.
7. Post manually. Nothing in this directory auto-posts.

## Voice and positioning

- Lead with the question: **Your pull request passes. Did it make the next change harder?**
- Use the deterministic `1 file vs 4 files` demo as evidence, never as a universal benchmark.
- Call EvolveCI an executable alpha and a weekend experiment, not a production oracle.
- Say explicitly that maintainers choose the probes and EvolveCI does not predict the future.
- Treat `retryable` as diagnostic evidence. The tool never silently reruns or hides a failure.
