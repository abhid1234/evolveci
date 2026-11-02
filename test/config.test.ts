import assert from "node:assert/strict";
import test from "node:test";
import { parseConfig } from "../src/config.js";

const VALID = `
version: 1
agent:
  command: ["node", "agent.mjs"]
scenarios:
  - id: add-role
    prompt: Add a role.
    verify: ["npm", "test"]
`;

test("parseConfig applies conservative defaults", () => {
  const config = parseConfig(VALID);
  assert.equal(config.scenarios.length, 1);
  assert.deepEqual(config.agent.command, ["node", "agent.mjs"]);
  assert.equal(config.thresholds.maxAddedDependencies, 0);
});

test("parseConfig rejects duplicate scenarios", () => {
  assert.throws(
    () =>
      parseConfig(`${VALID}\n  - id: add-role\n    prompt: Duplicate.\n    verify: ["npm", "test"]\n`),
    /duplicate scenario id/,
  );
});

test("parseConfig rejects shell command strings", () => {
  assert.throws(() => parseConfig(VALID.replace('["node", "agent.mjs"]', '"node agent.mjs"')), /non-empty array/);
});
