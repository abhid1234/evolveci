# Security policy

## Supported versions

EvolveCI is an executable alpha. Security fixes are applied to the latest published version.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting feature on the EvolveCI repository. Include the affected version, reproduction steps, impact, and any suggested mitigation.

## Execution boundary

EvolveCI executes repository-owned setup, agent, and verifier commands. Detached Git worktrees protect the developer's checkout from ordinary modifications, but they are **not** security sandboxes. Run the alpha only on repositories and configurations you trust.

Agent commands use argv execution without a shell and inherit a minimal environment by default. Explicitly allow only required credential variables. Multi-tenant or untrusted-repository execution remains unsupported until container or microVM isolation ships.
