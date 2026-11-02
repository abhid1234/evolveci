import fs from "node:fs";

const factCheck = fs.readFileSync(new URL("../launch/FACT-CHECK.md", import.meta.url), "utf8");
const rows = new Map();

for (const line of factCheck.split(/\r?\n/)) {
  if (!line.startsWith("|")) continue;
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim().replace(/^\*\*|\*\*$/g, ""));
  if (cells.length === 3 && cells[0] !== "Surface" && !cells[0].startsWith("---")) rows.set(cells[0], { url: cells[1], state: cells[2] });
}

const required = ["Code", "CI proof", "npm", "GitHub release", "Demo / playground", "Substack"];
const failures = [];

for (const surface of required) {
  const row = rows.get(surface);
  if (!row) {
    failures.push(`missing ${surface} row`);
    continue;
  }
  if (!/^https:\/\//.test(row.url)) failures.push(`${surface} does not have an HTTPS URL`);
  if (/\b(TBD|pending|404|no release|not live|do not post)\b/i.test(`${row.url} ${row.state}`)) {
    failures.push(`${surface} is not publicly verified: ${row.state}`);
  }
}

if (failures.length > 0) {
  console.error(`Public launch manifest is not ready:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Public launch manifest is complete. Independently open every URL before posting.");
