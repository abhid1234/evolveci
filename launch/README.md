# EvolveCI launch kit

This directory is the source of truth for EvolveCI launch materials. It is intentionally split into copy, visuals, and production assets so a public claim can be checked before it is posted.

## Deliverables

| Artifact | Purpose | Status |
|---|---|---|
| [`blog-evolveci.md`](blog-evolveci.md) | Canonical Substack essay source | Ready for editorial review |
| [`blog-evolveci-substack.html`](blog-evolveci-substack.html) | One-paste Substack HTML with three embedded figures | Ready |
| [`launch-posts.md`](launch-posts.md) | X, LinkedIn, HN, Reddit, and Product Hunt copy | Ready for editorial review |
| [`launch-evolveci.html`](launch-evolveci.html) | Self-contained launch control room with copy buttons for every social channel and the GitHub release | Ready |
| [`FACT-CHECK.md`](FACT-CHECK.md) | Claim ledger and public-surface readiness | Ready |
| [`LAUNCH-BRIEF.md`](LAUNCH-BRIEF.md) | One-page positioning, proof, audience, and launch gate | Ready |
| [`demo-script.md`](demo-script.md) | Two-minute terminal demo run-of-show | Ready |
| [`release-copy.md`](release-copy.md) | Draft GitHub release title and notes | Ready |
| [`FAQ.md`](FAQ.md) | Accurate answers for launch comments and objections | Ready |
| [`ACCESSIBILITY.md`](ACCESSIBILITY.md) | Figure alt text, video description, and caption checks | Ready |
| [`PUBLISHING-RUNBOOK.md`](PUBLISHING-RUNBOOK.md) | Exact morning publish order and independent readbacks | Ready |
| [`figures/`](figures/) | Five light-theme launch figures and 1100×220 banner | Rendered and visually verified |
| [`video/`](video/) | Script, deterministic animation, captions, narration, render pipeline, and 66-second MP4 | Production Will master verified |

## Launch sequence

1. Generate the final Will track, commit the production media, and run `npm run launch:candidate-check`; merge the launch-material PR only after that combined gate and CI pass.
2. Bootstrap `@avee1234/evolveci@0.1.0` once with account 2FA, following [`PUBLISHING-RUNBOOK.md`](PUBLISHING-RUNBOOK.md); the package does not yet exist, so trusted publishing cannot create it.
3. Verify the npm registry response independently.
4. Configure trusted publishing for subsequent releases and create the exact-SHA GitHub release.
5. Paste `blog-evolveci-substack.html` into Substack, upload the video, and record the public URL in [`FACT-CHECK.md`](FACT-CHECK.md).
6. Run `npm run launch:public-check` and independently open every public destination.
7. Post manually. Nothing in this directory auto-posts.

## Voice and positioning

- Lead with the question: **Your pull request passes. Did it make the next change harder?**
- Use the deterministic `1 file vs 4 files` demo as evidence, never as a universal benchmark.
- Call EvolveCI an executable alpha and a weekend experiment, not a production oracle.
- Say explicitly that maintainers choose the probes and EvolveCI does not predict the future.
- Treat `retryable` as diagnostic evidence. The tool never silently reruns or hides a failure.
