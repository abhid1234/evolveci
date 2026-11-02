import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const moduleUrl = `${pathToFileURL(path.resolve("src/access.js")).href}?run=${Date.now()}`;
const { can } = await import(moduleUrl);
const scenarios = {
  "add-enterprise-auditor": { role: "auditor", permission: "audit:read" },
  "add-support-operator": { role: "support", permission: "support:read" },
  "add-billing-viewer": { role: "billing-viewer", permission: "billing:read" },
};
const scenario = scenarios[process.env.EVOLVECI_SCENARIO_ID];
if (!scenario) throw new Error(`unknown scenario: ${process.env.EVOLVECI_SCENARIO_ID}`);

assert.equal(can(scenario.role, scenario.permission), true);
assert.equal(can(scenario.role, "project:write"), false);
assert.equal(can("admin", "project:write"), true);
