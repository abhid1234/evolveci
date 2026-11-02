import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const cache = "/tmp/evolveci-npm-verify-cache";
const { stdout } = await exec("npm", ["pack", "--dry-run", "--json", "--ignore-scripts", "--cache", cache], { maxBuffer: 4 * 1024 * 1024 });
const [pack] = JSON.parse(stdout);
const paths = new Set(pack.files.map((file) => file.path));

for (const required of ["package.json", "README.md", "CHANGELOG.md", "LICENSE", "dist/src/cli.js", "schemas/config.schema.json", "schemas/report.schema.json"]) {
  assert(paths.has(required), `package is missing ${required}`);
}
for (const file of paths) {
  assert(!file.startsWith("test/"), `test file leaked into package: ${file}`);
  assert(!file.startsWith("demo/"), `demo file leaked into package: ${file}`);
  assert(!file.includes(".env"), `environment file leaked into package: ${file}`);
}
process.stdout.write(`Package manifest verified: ${pack.files.length} files, ${pack.size} bytes.\n`);
