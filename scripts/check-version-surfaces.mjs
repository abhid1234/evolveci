import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const source = await readFile(new URL("../src/version.ts", import.meta.url), "utf8");
const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");

assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
assert.equal(packageJson.version, version, "package.json and VERSION disagree");
assert.match(source, new RegExp(`VERSION = ["']${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`));
assert.match(changelog, new RegExp(`^## \\[${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`, "m"));
process.stdout.write(`Version surfaces agree: ${version}\n`);
