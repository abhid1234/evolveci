import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = await mkdtemp(path.join(tmpdir(), "evolveci-package-smoke-"));
const consumer = path.join(root, "consumer");
const cache = path.join(root, "npm-cache");
const npm = process.env.npm_execpath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const npmPrefix = process.env.npm_execpath ? [process.env.npm_execpath] : [];

try {
  const { stdout: packOutput } = await exec(
    npm,
    [...npmPrefix, "pack", "--json", "--ignore-scripts", "--pack-destination", root, "--cache", cache],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  const [pack] = JSON.parse(packOutput);
  const tarball = path.join(root, pack.filename);
  await mkdir(consumer);
  await writeFile(path.join(consumer, "package.json"), '{"name":"evolveci-smoke-consumer","private":true}\n');
  await exec(
    npm,
    [...npmPrefix, "install", "--ignore-scripts", "--no-audit", "--no-fund", "--cache", cache, tarball],
    { cwd: consumer, maxBuffer: 4 * 1024 * 1024 },
  );
  const installedPackage = path.join(consumer, "node_modules", "@avee1234", "evolveci");
  const installedManifest = JSON.parse(await readFile(path.join(installedPackage, "package.json"), "utf8"));
  assert.equal(installedManifest.bin?.evolveci, "dist/src/cli.js");
  const binary = path.join(installedPackage, installedManifest.bin.evolveci);
  const version = (await exec(process.execPath, [binary, "--version"], { cwd: consumer })).stdout.trim();
  const help = (await exec(process.execPath, [binary, "--help"], { cwd: consumer })).stdout;
  assert.equal(version, pack.version);
  assert.match(help, /Counterfactual evolvability testing/);
  process.stdout.write(`Packed CLI smoke passed: ${pack.name}@${pack.version}.\n`);
} finally {
  await rm(root, { recursive: true, force: true });
}
