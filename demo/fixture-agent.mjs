import { mkdir, readFile, writeFile } from "node:fs/promises";

const access = await readFile("src/access.js", "utf8");

if (access.includes("ROLE_PERMISSIONS")) {
  const roles = await readFile("src/roles.js", "utf8");
  await writeFile(
    "src/roles.js",
    roles.replace(
      "  member: ['project:read'],",
      "  member: ['project:read'],\n  auditor: ['audit:read'],",
    ),
  );
} else {
  await writeFile(
    "src/access.js",
    access.replace(
      "  if (role === 'member') return permission === 'project:read';",
      "  if (role === 'member') return permission === 'project:read';\n" +
        "  if (role === 'auditor') return permission === 'audit:read';",
    ),
  );
  await mkdir("src/audit", { recursive: true });
  await mkdir("test/fixtures", { recursive: true });
  await writeFile("src/audit/auditor.js", "export const AUDITOR_ROLE = 'auditor';\n");
  await writeFile("src/audit/policy.js", "export const AUDITOR_PERMISSIONS = ['audit:read'];\n");
  await writeFile("test/fixtures/auditor.js", "export const auditorFixture = { role: 'auditor' };\n");
}
