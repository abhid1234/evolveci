import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const markdownFiles = ["README.md"];

async function collectMarkdown(directory) {
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdown(relative);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      markdownFiles.push(relative);
    }
  }
}

for (const directory of ["docs", "launch"]) await collectMarkdown(directory);

const failures = [];
let checked = 0;
const markdownTarget = /!?\[[^\]]*\]\(([^)]+)\)/g;

for (const file of markdownFiles.sort()) {
  const source = await readFile(path.join(root, file), "utf8");
  for (const match of source.matchAll(markdownTarget)) {
    const rawTarget = match[1].trim();
    const target = rawTarget.startsWith("<") && rawTarget.endsWith(">") ? rawTarget.slice(1, -1) : rawTarget;
    if (/^(?:https?:|mailto:|#)/i.test(target)) continue;

    const pathname = target.split(/[?#]/, 1)[0];
    if (!pathname) continue;
    checked += 1;
    try {
      await access(path.resolve(root, path.dirname(file), decodeURIComponent(pathname)));
    } catch {
      failures.push(`${file}: missing local link target ${rawTarget}`);
    }
  }
}

assert.equal(failures.length, 0, `Documentation link check failed:\n- ${failures.join("\n- ")}`);
console.log(`Documentation links verified: ${checked} local targets across ${markdownFiles.length} files.`);
