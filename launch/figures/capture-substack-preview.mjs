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
await page.setViewport({ width: 1100, height: 800, deviceScaleFactor: 1 });
await page.goto(`file://${path.join(here, "..", "blog-evolveci-substack.html")}`, { waitUntil: "networkidle0" });
await page.screenshot({ path: path.join(here, "substack-preview.png"), fullPage: true });
await browser.close();
