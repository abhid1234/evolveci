import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCommand } from "./process.js";
import type { ChangeMetrics, CommandSpec } from "./types.js";

async function git(repo: string, args: string[]): Promise<string> {
  const result = await runCommand({ command: ["git", ...args] as CommandSpec, cwd: repo, timeoutMs: 60_000 });
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim() || result.stdout.trim()}`);
  }
  return result.stdout.trim();
}

async function gitRaw(repo: string, args: string[]): Promise<string> {
  const result = await runCommand({ command: ["git", ...args] as CommandSpec, cwd: repo, timeoutMs: 60_000 });
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim() || result.stdout.trim()}`);
  }
  return result.stdout;
}

export async function repositoryRoot(cwd: string): Promise<string> {
  return git(cwd, ["rev-parse", "--show-toplevel"]);
}

export async function resolveRevision(repo: string, revision: string): Promise<string> {
  return git(repo, ["rev-parse", "--verify", `${revision}^{commit}`]);
}

export interface Worktree {
  path: string;
  dispose(): Promise<void>;
}

export async function createWorktree(repo: string, revision: string): Promise<Worktree> {
  const parent = await mkdtemp(path.join(tmpdir(), "evolveci-"));
  const worktreePath = path.join(parent, "worktree");
  await git(repo, ["worktree", "add", "--detach", "--quiet", worktreePath, revision]);
  let disposed = false;
  return {
    path: worktreePath,
    async dispose() {
      if (disposed) return;
      disposed = true;
      try {
        await git(repo, ["worktree", "remove", "--force", worktreePath]);
      } finally {
        await rm(parent, { recursive: true, force: true });
      }
    },
  };
}

type DependencyMap = Record<string, string>;

function mergeDependencies(value: unknown): DependencyMap {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  return value as DependencyMap;
}

export async function readDependencies(worktree: string): Promise<DependencyMap> {
  try {
    const packageJson = JSON.parse(await readFile(path.join(worktree, "package.json"), "utf8")) as Record<string, unknown>;
    return {
      ...mergeDependencies(packageJson.dependencies),
      ...mergeDependencies(packageJson.devDependencies),
      ...mergeDependencies(packageJson.optionalDependencies),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

export async function collectChangeMetrics(
  worktree: string,
  beforeDependencies: DependencyMap,
): Promise<ChangeMetrics> {
  const changedPathsOutput = await git(worktree, ["diff", "--name-only", "HEAD", "--"]);
  const trackedPaths = changedPathsOutput === "" ? [] : changedPathsOutput.split("\n").filter(Boolean);
  const untrackedOutput = await gitRaw(worktree, ["ls-files", "--others", "--exclude-standard", "-z"]);
  const untrackedPaths = untrackedOutput === "" ? [] : untrackedOutput.split("\0").filter(Boolean);
  const changedPaths = [...new Set([...trackedPaths, ...untrackedPaths])].sort();
  const numstat = await git(worktree, ["diff", "--numstat", "HEAD", "--"]);
  let linesAdded = 0;
  let linesDeleted = 0;
  for (const line of numstat.split("\n")) {
    if (!line) continue;
    const [added, deleted] = line.split("\t");
    if (added !== "-" && added !== undefined) linesAdded += Number.parseInt(added, 10) || 0;
    if (deleted !== "-" && deleted !== undefined) linesDeleted += Number.parseInt(deleted, 10) || 0;
  }
  for (const file of untrackedPaths) {
    const content = await readFile(path.join(worktree, file));
    if (content.includes(0)) continue;
    const text = content.toString("utf8");
    if (text.length > 0) linesAdded += text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  }
  const afterDependencies = await readDependencies(worktree);
  const dependenciesAdded = Object.keys(afterDependencies)
    .filter((name) => !(name in beforeDependencies))
    .sort();
  const dependenciesChanged = Object.keys(afterDependencies)
    .filter((name) => name in beforeDependencies && afterDependencies[name] !== beforeDependencies[name])
    .sort();
  return {
    filesChanged: changedPaths.length,
    linesAdded,
    linesDeleted,
    churn: linesAdded + linesDeleted,
    testFilesChanged: changedPaths.filter((file) => /(^|\/)(test|tests|__tests__)(\/|$)|\.(test|spec)\.[^.]+$/.test(file)).length,
    dependenciesAdded,
    dependenciesChanged,
    changedPaths,
  };
}
