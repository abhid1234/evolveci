import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const modulePath = process.env.PUPPETEER_CORE_PATH;
const executablePath = process.env.CHROME_BIN;

if (!modulePath || !executablePath) {
  throw new Error("Set PUPPETEER_CORE_PATH and CHROME_BIN before rendering.");
}

const puppeteer = require(modulePath);
const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
await page.goto(`file://${path.join(here, "figures-export.html")}`, { waitUntil: "networkidle0" });

const outputs = [
  ["#fig-1", "01-current-vs-next.png"],
  ["#fig-2", "02-one-vs-four.png"],
  ["#fig-3", "03-paired-experiment.png"],
  ["#fig-4", "04-evidence-not-score.png"],
  ["#fig-5", "05-honest-boundaries.png"],
  ["#banner", "blog-banner.png"],
];

for (const [selector, filename] of outputs) {
  const element = await page.$(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  await element.screenshot({ path: path.join(here, filename) });
}

await browser.close();

for (const [, filename] of outputs) {
  if (!fs.existsSync(path.join(here, filename))) throw new Error(`Missing output: ${filename}`);
}
