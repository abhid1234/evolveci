import { mkdir, readFile, writeFile } from "node:fs/promises";

const access = await readFile("src/access.js", "utf8");
const scenarios = {
  "add-enterprise-auditor": { role: "auditor", permission: "audit:read" },
  "add-support-operator": { role: "support", permission: "support:read" },
  "add-billing-viewer": { role: "billing-viewer", permission: "billing:read" },
};
const scenario = scenarios[process.env.EVOLVECI_SCENARIO_ID];
if (!scenario) throw new Error(`unknown scenario: ${process.env.EVOLVECI_SCENARIO_ID}`);

if (access.includes("ROLE_PERMISSIONS")) {
  const roles = await readFile("src/roles.js", "utf8");
  await writeFile(
    "src/roles.js",
    roles.replace(
      "  member: ['project:read'],",
      `  member: ['project:read'],\n  '${scenario.role}': ['${scenario.permission}'],`,
    ),
  );
} else {
  await writeFile(
    "src/access.js",
    access.replace(
      "  if (role === 'member') return permission === 'project:read';",
      "  if (role === 'member') return permission === 'project:read';\n" +
        `  if (role === '${scenario.role}') return permission === '${scenario.permission}';`,
    ),
  );
  await mkdir("src/audit", { recursive: true });
  await mkdir("test/fixtures", { recursive: true });
  await writeFile("src/audit/role.js", `export const ROLE = '${scenario.role}';\n`);
  await writeFile("src/audit/policy.js", `export const PERMISSIONS = ['${scenario.permission}'];\n`);
  await writeFile("test/fixtures/future-role.js", `export const roleFixture = { role: '${scenario.role}' };\n`);
}
