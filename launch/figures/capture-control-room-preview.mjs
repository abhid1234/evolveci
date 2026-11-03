import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const modulePath = process.env.PUPPETEER_CORE_PATH;
const executablePath = process.env.CHROME_BIN;

if (!modulePath || !executablePath) throw new Error("Set PUPPETEER_CORE_PATH and CHROME_BIN.");
const puppeteer = require(modulePath);
const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.goto(`file://${path.join(here, "..", "launch-evolveci.html")}`, { waitUntil: "networkidle0" });
await page.screenshot({ path: path.join(here, "control-room-preview.png"), fullPage: true });
await browser.close();
