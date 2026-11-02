# Contributing

## Development

Requirements: Node.js 20.11 or newer and Git.

```bash
npm ci
npm run check
npm run demo
```

## Pull requests

- Keep changes focused and include tests for behavior changes.
- Preserve the paired-experiment rule: base and head receive the same scenario, adapter, budget, verifier, and environment policy.
- Do not add model-graded quality scores as deterministic evidence.
- Update `README.md`, `docs/SPEC.md`, and `CHANGELOG.md` when public behavior changes.
- Run `npm run release:check` before requesting review.

## Commit style

Use short, imperative conventional commits such as `feat: add repeat aggregation` or `fix: include untracked files in churn`.
