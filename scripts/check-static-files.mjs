import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";

const jsonFiles = ["schemas/config.schema.json", "schemas/report.schema.json", "schemas/report-v2.schema.json"];
const yamlFiles = [".github/workflows/ci.yml", ".github/workflows/release.yml", "examples/scenarios.yaml"];

for (const file of jsonFiles) {
  const document = JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
  assert.equal(document.$schema, "https://json-schema.org/draft/2020-12/schema", `${file} uses the wrong schema draft`);
}
const reportSchemas = await Promise.all(
  ["schemas/report.schema.json", "schemas/report-v2.schema.json"].map(async (file) =>
    JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8")),
  ),
);
assert.deepEqual(reportSchemas.map((schema) => schema.properties.schemaVersion.const), [1, 2]);
assert.equal(new Set(reportSchemas.map((schema) => schema.$id)).size, reportSchemas.length, "report schema IDs must be unique");
for (const file of yamlFiles) {
  const document = parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
  assert(document && typeof document === "object", `${file} is not a YAML object`);
}

const release = await readFile(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");
assert.match(release, /id-token: write/);
assert.match(release, /npm@\^11\.5\.1/);
assert.match(release, /steps\.package\.outputs\.tag/);
assert.match(release, /published != 'true'/);
assert.doesNotMatch(release, /NODE_AUTH_TOKEN|NPM_TOKEN/);
process.stdout.write(`Static files verified: ${jsonFiles.length} JSON schemas and ${yamlFiles.length} YAML files.\n`);
