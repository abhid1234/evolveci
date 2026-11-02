# EvolveCI launch posts

Drafts only. Do not post until the npm, release, demo, and Substack rows in [`FACT-CHECK.md`](FACT-CHECK.md) are verified.

## X

Your PR passes. Did it make the *next* change harder?

EvolveCI runs a follow-up on base + head, then compares the patches. Demo: 1 file vs 4. No opaque AI score—just evidence.

https://github.com/abhid1234/evolveci?utm_source=twitter&utm_medium=post&utm_campaign=evolveci-launch

## LinkedIn

Your pull request passes every test. Did it quietly make the next change harder?

That question nerd-sniped me, so over a few weekends I built EvolveCI—an experiment in counterfactual CI.

A maintainer defines a plausible follow-up task and a deterministic verifier. EvolveCI runs the same task against the base and head revisions in isolated Git worktrees, then compares the patches the agent had to make.

The small demo is the part that made it click for me. Both revisions preserve the same current permissions behavior. But adding the next role takes one changed file on the base and four on the coupled head. Green today; more expensive tomorrow.

It is deliberately not an AI maintainability score. You see the changed paths, churn, tests, dependencies, duration, failures, and raw logs. The probes are maintainer-chosen, failure remains visible, and noisy runs become inconclusive instead of confident.

It is rough and early. The alpha has a Codex adapter today; the adapter contract is intended to stay vendor-neutral. I would love people to poke holes in the scenario model: what would make a future-change probe fair enough to trust in your repository?

First-comment links below.

### LinkedIn first comment

Code + deterministic demo: https://github.com/abhid1234/evolveci?utm_source=linkedin&utm_medium=post&utm_campaign=evolveci-launch

How it works: https://github.com/abhid1234/evolveci/blob/main/docs/SPEC.md?utm_source=linkedin&utm_medium=post&utm_campaign=evolveci-launch

#opensource #devtools #aiagents #softwareengineering #continuousintegration

## Hacker News

### Title

Show HN: EvolveCI – test whether a PR makes the next change harder

### Body

https://github.com/abhid1234/evolveci?utm_source=hackernews&utm_medium=post&utm_campaign=evolveci-launch

EvolveCI is an executable alpha for counterfactual evolvability testing. A repository defines a plausible follow-up task and a deterministic verifier. The CLI runs that same task against base and head in detached Git worktrees, then compares success, changed files, churn, tests, dependencies, duration, and complete adapter telemetry.

The bundled deterministic demo keeps current behavior identical on both revisions but changes the internal structure. Adding each future role takes one file on the registry-based base and four files on the coupled head. That is illustrative mechanism evidence, not a claim that file count is universally equivalent to maintainability.

The tool counterbalances repeated pairs, reports medians and variability, preserves failed attempts, and emits versioned JSON plus Markdown/offline HTML and raw logs. It has a built-in Codex adapter today. Worktrees are isolation for the checkout, not a sandbox, so the alpha is for trusted repositories and commands.

I would value criticism of the scenario contract and the evidence model more than the demo result itself.

## Reddit — r/LocalLLaMA

### Title

I built EvolveCI to test whether a PR makes the next agent change harder

### Body

Most CI tells me whether code works now. I wanted to test a narrower question: if the next ordinary requirement arrived, did this PR make an agent touch more code to implement it?

EvolveCI runs the same maintainer-defined task against base and head revisions in separate Git worktrees, verifies both results, and compares the resulting patches. It reports raw evidence rather than asking a model to grade “maintainability.”

The deterministic demo uses two permission-service implementations with identical current behavior. Three follow-up role additions each take one changed file on the base and four on the coupled head. The fixture is intentionally purpose-built; it proves the mechanism, not generality.

The alpha is open source, has a built-in Codex adapter, and is honest about the gaps: no sandbox, no hosted runner, and no public-repository validation yet. I would appreciate feedback on how you would choose fair, repository-owned future-change probes.

Code: https://github.com/abhid1234/evolveci?utm_source=reddit&utm_medium=post&utm_campaign=evolveci-launch

## Product Hunt

**Tagline:** CI for the change after this one

**Maker comment:**

I built EvolveCI after noticing a class of pull requests that keep every current test green while making the next ordinary change spread across more files.

Maintainers define a plausible follow-up task and deterministic verifier. EvolveCI executes the same task on base and head, then reports the actual patch evidence—success, files, churn, tests, dependencies, duration, variability, and failures.

The alpha is intentionally conservative: no opaque score, no automatic retries, no claim that it predicts the roadmap. It is a weekend experiment for turning one architectural hunch into a repeatable comparison.

I would love feedback on the scenario format and what evidence you would require before putting a check like this in CI.
