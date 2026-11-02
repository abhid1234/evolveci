import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const moduleUrl = `${pathToFileURL(path.resolve("src/access.js")).href}?run=${Date.now()}`;
const { can } = await import(moduleUrl);

assert.equal(can("auditor", "audit:read"), true);
assert.equal(can("auditor", "project:write"), false);
assert.equal(can("admin", "project:write"), true);
