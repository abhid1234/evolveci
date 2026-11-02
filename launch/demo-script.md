# EvolveCI two-minute demo script

## Before recording

- Use a clean terminal at 1280×720 or larger.
- Clone the public `main` branch after the launch PR merges.
- Increase the terminal font until each command is legible in a social-video crop.
- Keep `launch/figures/02-one-vs-four.png` ready as the closing visual.

## 0:00–0:20 · Set up the question

> This pull request passes every current test. EvolveCI asks a different question: if one ordinary follow-up arrived now, did the pull request make that change harder?

Show the repository README and the paired-experiment diagram.

## 0:20–0:45 · Run the fixture

```bash
git clone https://github.com/abhid1234/evolveci
cd evolveci
npm install
npm run demo
```

> The bundled demo is deterministic, so we can inspect the orchestration without model variance or API cost.

## 0:45–1:20 · Show the evidence

```bash
node -e 'const r=require("./demo/output/report.json"); for (const s of r.scenarios) console.log(s.id, s.base.medianMetrics.changedFiles, "->", s.head.medianMetrics.changedFiles)'
```

> Both revisions preserve the current permission behavior. On the registry-based base, each new role changes one file. On the coupled head, it changes four. EvolveCI retains the changed paths, churn, verifier result, duration, and logs behind that warning.

Open `demo/output/report.html` and pause on one scenario. Point out the base/head values and the evidence links.

## 1:20–1:45 · Explain the boundary

> This does not prove that one file is always better, and it does not predict the roadmap. The maintainer chose this probe. EvolveCI makes that narrow design claim executable and repeatable.

Mention that worktrees isolate the checkouts but do not sandbox untrusted code.

## 1:45–2:00 · Close

Show the 1-vs-4 figure.

> Your pull request passes. Test the change after it. The alpha, demo, schemas, and raw limitations are on GitHub.
