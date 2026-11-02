# Launch-media accessibility

## Primary image alt text

### Blog banner

EvolveCI banner asking, “Your pull request passes. What did it do to the next change?” Beside the title, a green proof card reads “1 to 4 changed files in the demo.”

### Current versus next

Diagram contrasting conventional CI, which asks whether a revision works now, with counterfactual CI, which asks what a plausible follow-up change would cost.

### One file versus four

Two-panel comparison of the deterministic EvolveCI fixture. The registry-based base revision needs one changed file to add a role; the coupled head revision needs four changed files. A note says this is mechanism evidence, not a universal benchmark.

### Paired experiment

Three-step flow: define a repository-owned task and verifier, execute it against detached base and head worktrees, then compare success, patch shape, churn, tests, dependencies, duration, and failures.

### Evidence, not a score

Six evidence categories: patch evidence, execution evidence, failure evidence, variability, portable reports, and honest uncertainty. A quote says, “Show me what changed, not what a model thinks about it.”

### Honest boundaries

Comparison of what EvolveCI can and cannot show. It can show that one chosen follow-up became measurably different between two revisions. It cannot show that it predicted a roadmap or measured maintainability in general.

## Video description

A 66-second, light-background motion-graphics explainer. It begins with a passing pull request, asks what happened to the next change, explains the paired base-versus-head experiment, shows the deterministic one-file-versus-four-file result, lists the evidence retained, preserves failures as evidence, states the tool's narrow limitations, and closes with stable demo, code, npm, and Substack destinations. The publishing runbook still requires independent public readback before any destination is described as live.

The narration source is [`video/narration.txt`](video/narration.txt), and timed captions are available in [`video/captions.srt`](video/captions.srt).

## Publishing checks

- Add the relevant alt text to every uploaded figure; do not put the filename in the alt field.
- Upload `captions.srt` when the platform supports caption tracks.
- Confirm captions are enabled and synchronized after platform transcoding.
- Do not communicate the base-versus-head distinction by green and orange alone; keep the text labels visible.
- Preserve the written link below the video so the call to action is available without audio.
