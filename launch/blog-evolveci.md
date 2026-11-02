# Your pull request passes. What did it do to the next change?

*EvolveCI runs the same maintainer-chosen follow-up task against both sides of a pull request, then measures the patches the agent had to make.*

Most continuous integration answers a question about the present: does this code build, lint, and pass its tests?

That is necessary. It is also incomplete.

A pull request can preserve every current behavior and still leave the codebase harder to change. A registry becomes a chain of conditionals. One source of truth gets copied into four files. A clean boundary turns into a special case. Nothing is broken today, so every check is green. The cost arrives in the next pull request.

That problem kept bothering me, so I built a weekend experiment called **EvolveCI**.

The question it asks is simple:

> If the next ordinary requirement arrived right now, would this pull request make an agent touch more code to implement it?

EvolveCI does not ask a model to grade architecture. It does not generate a mysterious maintainability score. A maintainer writes a concrete future-change probe and a deterministic verifier. EvolveCI runs that exact task against the base revision and the head revision in separate Git worktrees, then compares what actually happened.

## The small demo that made the idea click

The repository includes a deliberately simple permissions service.

On the base revision, roles live in one registry. On the head revision, the same current behavior has been rewritten as tightly coupled conditionals. Both versions pass their tests. Both look fine if the only question is whether admin and member permissions still work today.

Then EvolveCI asks for three plausible follow-ups: add an enterprise auditor, a support operator, and a billing viewer.

For each task, the fixture agent changes **one file** on the base revision. On the head revision it needs **four files**, including another test fixture. The current behavior is identical; the next change is not.

That is the whole pitch in one picture: green today, more expensive tomorrow.

The demo is deterministic and purpose-built. It is not evidence that every four-file change is bad, or that EvolveCI can predict what your roadmap will be. It proves the comparison mechanism without mixing in model variance.

## How the comparison works

A repository owns its scenarios. Each one contains a prompt, a verifier command, and explicit thresholds.

For every scenario, EvolveCI:

- resolves base and head to exact commits;
- creates a detached worktree for each side;
- runs the same setup, agent command, prompt, timeout, and verifier policy;
- records whether the probe succeeded and what patch it required;
- repeats the pair in counterbalanced order;
- reports medians, variability, and any configured regression.

The evidence bundle includes JSON, Markdown, an offline HTML report, changed paths, and raw command logs. It measures patch size, churn, test files, dependencies, duration, and exact token usage when an adapter supplies complete telemetry.

There is no single “evolvability score.” Reviewers can see the scenario, the threshold, both outcomes, and the raw evidence behind the conclusion.

## Failure is evidence too

The detail I did not want to lose was failure.

If an agent times out, a verifier crashes, or a command cannot launch, that attempt should not vanish behind an automatic retry. EvolveCI schema v2 records the failed stage, the cause, whether the evidence looks transient or terminal, and the command logs. The attempt still lowers the success rate. Nothing is silently rerun.

If a failed attempt also leaves malformed files behind, metric collection can fail. In that case the report says `metrics: null` and includes an explicit error. It does not invent a clean-looking row of zeroes.

That distinction sounds small, but it is the difference between a diagnostic and a story the tool tells itself.

## The fairness problem

Comparing agent runs is noisy. A slower second run can make one revision look worse even when the code is equivalent. Model output varies. Caches warm up. Background processes steal time.

The alpha makes a few conservative choices:

- base and head run sequentially rather than competing for the same machine;
- odd repetitions run base then head, while even repetitions reverse the order;
- summaries use medians;
- high duration variance makes a scenario inconclusive;
- both sides must resolve to different commits;
- incomplete telemetry produces no token claim.

This is not a substitute for statistical experimental design. It is a refusal to turn obviously noisy evidence into a confident verdict.

## What EvolveCI is not

EvolveCI is an executable alpha, not a hosted product.

It has a built-in Codex adapter today and a vendor-neutral adapter contract intended for harnesses such as Claude Code, Cursor, and Google Antigravity later. It does not yet have a GitHub App, container or microVM isolation, scenario generation, or public-repository validation.

Worktrees protect your checkout from the experiment. They do not contain untrusted code. Run the current alpha only on repositories and agent commands you trust.

And maintainers still have to choose good probes. A contrived scenario can produce a contrived result. The point is not to outsource roadmap judgment; it is to make a design claim executable.

## Try the mechanism

The deterministic demo is one command:

```bash
git clone https://github.com/abhid1234/evolveci
cd evolveci
npm install
npm run demo
```

It writes the JSON, Markdown, HTML, and raw evidence under `demo/output/`.

Version `0.1.0` is prepared but has not yet been published to npm. Until the registry readback is live, use the repository rather than a speculative install command.

The code, schemas, demo, and limitations are all here:

- [Code and demo](https://github.com/abhid1234/evolveci?utm_source=substack&utm_medium=newsletter&utm_campaign=evolveci-launch)
- [Executable specification](https://github.com/abhid1234/evolveci/blob/main/docs/SPEC.md?utm_source=substack&utm_medium=newsletter&utm_campaign=evolveci-launch)
- [Green cross-platform CI](https://github.com/abhid1234/evolveci/actions/runs/41392669881?utm_source=substack&utm_medium=newsletter&utm_campaign=evolveci-launch)

It is rough and early. I would especially like people to poke holes in the scenario model: what would make a future-change probe fair enough to trust in your repository?
