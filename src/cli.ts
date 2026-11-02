#!/usr/bin/env node
import path from "node:path";
import { loadConfig } from "./config.js";
import { repositoryRoot } from "./git.js";
import { renderMarkdown } from "./report.js";
import { runComparison } from "./runner.js";
import { VERSION } from "./version.js";

const VALUE_OPTIONS = new Set(["--repo", "--config", "--output", "--base", "--head"]);

function usage(): string {
  return `EvolveCI ${VERSION}

Counterfactual evolvability testing for pull requests.

Usage:
  evolveci validate [--config .evolveci/scenarios.yaml]
  evolveci run --base <git-ref> --head <git-ref> [options]

Options:
  --repo <path>       Repository to evaluate (default: current repository)
  --config <path>     Scenario config (default: .evolveci/scenarios.yaml)
  --output <path>     Evidence output (default: .evolveci/runs/latest)
  --version           Print version
  --help              Show this help
`;
}

function valueFor(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function validateArguments(args: string[], command: string): void {
  const allowed = new Set(command === "run" ? VALUE_OPTIONS : ["--repo", "--config"]);
  const seen = new Set<string>();
  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument?.startsWith("--")) throw new Error(`unexpected positional argument: ${argument ?? ""}`);
    if (!allowed.has(argument)) throw new Error(`unknown option for ${command}: ${argument}`);
    if (seen.has(argument)) throw new Error(`duplicate option: ${argument}`);
    seen.add(argument);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
    index += 1;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.length === 0) {
    process.stdout.write(usage());
    return;
  }
  if (args.includes("--version")) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  const command = args[0];
  if (command !== "validate" && command !== "run") throw new Error(`unknown command: ${command}`);
  validateArguments(args, command);
  const requestedRepo = path.resolve(valueFor(args, "--repo") ?? process.cwd());
  const repository = await repositoryRoot(requestedRepo);
  const configPath = path.resolve(repository, valueFor(args, "--config") ?? ".evolveci/scenarios.yaml");
  const config = await loadConfig(configPath);

  if (command === "validate") {
    process.stdout.write(`Valid EvolveCI config: ${config.scenarios.length} scenario(s).\n`);
    return;
  }
  const base = valueFor(args, "--base");
  const head = valueFor(args, "--head");
  if (!base || !head) throw new Error("run requires --base and --head");
  const outputDir = path.resolve(repository, valueFor(args, "--output") ?? ".evolveci/runs/latest");
  const report = await runComparison({ repository, base, head, config, outputDir });
  process.stdout.write(renderMarkdown(report));
  process.exitCode = report.conclusion === "warning" ? 2 : report.conclusion === "inconclusive" ? 3 : 0;
}

main().catch((error: unknown) => {
  process.stderr.write(`EvolveCI error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
