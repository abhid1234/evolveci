import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = await mkdtemp(path.join(tmpdir(), "evolveci-package-verify-"));
const npm = process.env.npm_execpath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const npmPrefix = process.env.npm_execpath ? [process.env.npm_execpath] : [];

try {
  const { stdout } = await exec(npm, [...npmPrefix, "pack", "--dry-run", "--json", "--ignore-scripts", "--cache", path.join(root, "npm-cache")], { maxBuffer: 4 * 1024 * 1024 });
  const [pack] = JSON.parse(stdout);
  const paths = new Set(pack.files.map((file) => file.path));

  for (const required of ["package.json", "README.md", "CHANGELOG.md", "LICENSE", "docs/ADAPTERS.md", "docs/RELEASE.md", "dist/src/cli.js", "schemas/config.schema.json", "schemas/report.schema.json"]) {
    assert(paths.has(required), `package is missing ${required}`);
  }
  for (const file of paths) {
    assert(!file.startsWith("test/"), `test file leaked into package: ${file}`);
    assert(!file.startsWith("demo/"), `demo file leaked into package: ${file}`);
    assert(!file.includes(".env"), `environment file leaked into package: ${file}`);
  }
  process.stdout.write(`Package manifest verified: ${pack.files.length} files, ${pack.size} bytes.\n`);
} finally {
  await rm(root, { recursive: true, force: true });
}
