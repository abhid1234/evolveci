import fs from "node:fs";
import path from "node:path";

const factCheckFile = process.env.EVOLVECI_FACT_CHECK_FILE
  ? path.resolve(process.env.EVOLVECI_FACT_CHECK_FILE)
  : new URL("../launch/FACT-CHECK.md", import.meta.url);
const launchPostsFile = process.env.EVOLVECI_LAUNCH_POSTS_FILE
  ? path.resolve(process.env.EVOLVECI_LAUNCH_POSTS_FILE)
  : new URL("../launch/launch-posts.md", import.meta.url);
const factCheck = fs.readFileSync(factCheckFile, "utf8");
const launchPosts = fs.readFileSync(launchPostsFile, "utf8");
const rows = new Map();
const failures = [];

for (const line of factCheck.split(/\r?\n/)) {
  if (!line.startsWith("|")) continue;
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim().replace(/^\*\*|\*\*$/g, ""));
  if (cells.length === 3 && cells[0] !== "Surface" && !cells[0].startsWith("---")) {
    if (rows.has(cells[0])) failures.push(`duplicate ${cells[0]} row`);
    rows.set(cells[0], { url: cells[1], state: cells[2] });
  }
}

const required = new Map([
  ["Code", /^https:\/\/github\.com\/abhid1234\/evolveci\/?$/],
  ["CI proof", /^https:\/\/github\.com\/abhid1234\/evolveci\/actions\/runs\/41704091228$/],
  ["npm", /^https:\/\/www\.npmjs\.com\/package\/@avee1234\/evolveci\/?$/],
  ["GitHub release", /^https:\/\/github\.com\/abhid1234\/evolveci\/releases\/tag\/v0\.1\.0$/],
  ["Demo / playground", /^https:\/\/github\.com\/abhid1234\/evolveci#run-the-deterministic-demo$/],
  ["Substack", /^https:\/\/abhid\.substack\.com\/p\/[a-z0-9-]+\/?$/],
]);

for (const [surface, canonicalUrl] of required) {
  const row = rows.get(surface);
  if (!row) {
    failures.push(`missing ${surface} row`);
    continue;
  }
  if (!canonicalUrl.test(row.url)) failures.push(`${surface} does not use its canonical launch URL`);
  if (!/^LIVE_VERIFIED\b/.test(row.state)) failures.push(`${surface} is not publicly verified: ${row.state}`);
}

const linkedInComment = launchPosts.split("### LinkedIn first comment")[1]?.split("## Hacker News")[0] ?? "";
if (/\{\{[A-Z0-9_]+\}\}|\bTBD\b/.test(linkedInComment)) {
  failures.push("LinkedIn first comment still contains a launch-link placeholder");
}
for (const surface of ["Code", "npm", "GitHub release", "Demo / playground", "Substack"]) {
  const url = rows.get(surface)?.url;
  if (url && !linkedInComment.includes(url)) failures.push(`LinkedIn first comment is missing the verified ${surface} URL`);
}

if (failures.length > 0) {
  console.error(`Public launch manifest is not ready:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Public launch manifest and LinkedIn first-comment links match every verified launch surface.");
