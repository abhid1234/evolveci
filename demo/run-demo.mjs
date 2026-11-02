import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { runComparison } from "../dist/src/runner.js";
import { renderMarkdown } from "../dist/src/report.js";

const exec = promisify(execFile);
const demoDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(demoDir);
const fixtureAgent = path.join(demoDir, "fixture-agent.mjs");
const verifier = path.join(demoDir, "verify-auditor.mjs");
const outputDir = path.join(demoDir, "output");
const tempRoot = await mkdtemp(path.join(tmpdir(), "evolveci-demo-"));
const repository = path.join(tempRoot, "permissions-service");

async function git(...args) {
  return (await exec("git", args, { cwd: repository })).stdout.trim();
}

try {
  await mkdir(path.join(repository, "src"), { recursive: true });
  await mkdir(path.join(repository, "test"), { recursive: true });
  await writeFile(path.join(repository, "package.json"), '{"name":"permissions-service","type":"module","private":true}\n');
  await writeFile(
    path.join(repository, "src/roles.js"),
    "export const ROLE_PERMISSIONS = {\n  admin: ['project:read', 'project:write'],\n  member: ['project:read'],\n};\n",
  );
  await writeFile(
    path.join(repository, "src/access.js"),
    "import { ROLE_PERMISSIONS } from './roles.js';\n\nexport function can(role, permission) {\n  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;\n}\n",
  );
  await writeFile(
    path.join(repository, "test/current.test.mjs"),
    "import assert from 'node:assert/strict';\nimport { can } from '../src/access.js';\nassert.equal(can('admin', 'project:write'), true);\nassert.equal(can('member', 'project:write'), false);\n",
  );

  await exec("git", ["init", "--quiet", "--initial-branch=main", repository]);
  await git("config", "user.email", "demo@evolveci.dev");
  await git("config", "user.name", "EvolveCI Demo");
  await git("add", ".");
  await git("commit", "--quiet", "-m", "base: role registry");
  const base = await git("rev-parse", "HEAD");

  await writeFile(
    path.join(repository, "src/access.js"),
    "// TIGHTLY_COUPLED_ROLE_BRANCHES\nexport function can(role, permission) {\n  if (role === 'admin') return permission === 'project:read' || permission === 'project:write';\n  if (role === 'member') return permission === 'project:read';\n  return false;\n}\n",
  );
  await git("add", "src/access.js");
  await git("commit", "--quiet", "-m", "head: inline role behavior");

  await rm(outputDir, { recursive: true, force: true });
  const config = {
    version: 1,
    agent: {
      command: [process.execPath, fixtureAgent],
      timeoutMs: 30_000,
      inheritEnvironment: false,
      passEnvironment: [],
      promptTransport: "environment",
    },
    execution: { repetitions: 3, maxCoefficientOfVariationPercent: 10_000 },
    thresholds: {
      maxAddedFiles: 1,
      maxDurationIncreasePercent: 10_000,
      maxChurnIncreasePercent: 500,
      maxAddedTestFiles: 0,
      maxAddedDependencies: 0,
      maxChangedDependencies: 0,
    },
    scenarios: [
      {
        id: "add-enterprise-auditor",
        prompt: "Add a read-only enterprise auditor role without changing existing role behavior.",
        verify: [process.execPath, verifier],
        timeoutMs: 30_000,
      },
      {
        id: "add-support-operator",
        prompt: "Add a support operator that can read support cases without changing existing role behavior.",
        verify: [process.execPath, verifier],
        timeoutMs: 30_000,
      },
      {
        id: "add-billing-viewer",
        prompt: "Add a billing viewer that can read billing records without changing existing role behavior.",
        verify: [process.execPath, verifier],
        timeoutMs: 30_000,
      },
    ],
  };
  const report = await runComparison({ repository, base, head: "HEAD", config, outputDir });
  process.stdout.write(renderMarkdown(report));
  process.stdout.write(`\nEvidence: ${outputDir}\n`);

  const persisted = JSON.parse(await readFile(path.join(outputDir, "report.json"), "utf8"));
  if (persisted.conclusion !== "warning") throw new Error("demo did not expose the expected regression");
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
