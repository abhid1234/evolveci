# Agent adapter contract

EvolveCI deliberately treats coding agents as subprocess adapters. The comparison engine owns isolation, pairing, verification, evidence, and policy; an adapter owns only the translation from one scenario prompt to one agent invocation.

## Inputs

The adapter runs with its working directory set to the detached scenario worktree.

It receives:

- the scenario prompt on stdin when `promptTransport: stdin`;
- or `EVOLVECI_PROMPT` when `promptTransport: environment`;
- `EVOLVECI_SCENARIO_ID`;
- `EVOLVECI_SIDE` (`base` or `head`);
- `EVOLVECI_REVISION` (exact commit SHA);
- `EVOLVECI_ATTEMPT` (one-based repeat number);
- `EVOLVECI_REPOSITORY` (source Git repository);
- `EVOLVECI_WORKTREE` (current detached worktree).

## Required behavior

1. Modify only the current worktree and agent-owned cache/session paths.
2. Exit `0` only when the coding task completed normally.
3. Use stdout and stderr for diagnostic events; EvolveCI captures both with truncation markers.
4. Never run the scenario verifier or grade the result. EvolveCI keeps evaluation outside the agent boundary.
5. Never switch branches, commit, push, publish, or deploy.

## Built-in Codex adapter

```bash
printf '%s' 'Add the future change' | evolveci adapter codex
```

Optional flags:

```text
--model <id>        Override the configured Codex model
--profile <name>    Load a named Codex profile
--codex-bin <path>  Use a specific Codex executable
```

The adapter runs this constrained shape:

```text
codex exec --ephemeral --sandbox workspace-write --cd <worktree> --color never --json -
```

It does not pass `--dangerously-bypass-approvals-and-sandbox` or add writable directories outside the scenario worktree.

## Adding another agent

An external adapter can be any executable that follows this contract. Prefer a small wrapper stored in the evaluated repository so its exact behavior is versioned with the scenarios. Use argv arrays in YAML and stdin transport. Add only the credential environment names that the tool requires.
