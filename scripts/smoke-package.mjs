import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = await mkdtemp(path.join(tmpdir(), "evolveci-package-smoke-"));
const consumer = path.join(root, "consumer");
const cache = path.join(root, "npm-cache");

try {
  const { stdout: packOutput } = await exec(
    "npm",
    ["pack", "--json", "--ignore-scripts", "--pack-destination", root, "--cache", cache],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  const [pack] = JSON.parse(packOutput);
  const tarball = path.join(root, pack.filename);
  await mkdir(consumer);
  await writeFile(path.join(consumer, "package.json"), '{"name":"evolveci-smoke-consumer","private":true}\n');
  await exec(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--cache", cache, tarball],
    { cwd: consumer, maxBuffer: 4 * 1024 * 1024 },
  );
  const binary = path.join(consumer, "node_modules", ".bin", "evolveci");
  const version = (await exec(binary, ["--version"], { cwd: consumer })).stdout.trim();
  const help = (await exec(binary, ["--help"], { cwd: consumer })).stdout;
  assert.equal(version, pack.version);
  assert.match(help, /Counterfactual evolvability testing/);
  process.stdout.write(`Packed CLI smoke passed: ${pack.name}@${pack.version}.\n`);
} finally {
  await rm(root, { recursive: true, force: true });
}
