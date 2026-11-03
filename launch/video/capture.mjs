import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const modulePath = process.env.PUPPETEER_CORE_PATH;
const executablePath = process.env.CHROME_BIN;
const ffmpeg = process.env.FFMPEG_BIN || "ffmpeg";
const fps = 24;
const duration = 66;

if (!modulePath || !executablePath) throw new Error("Set PUPPETEER_CORE_PATH and CHROME_BIN.");
const puppeteer = require(modulePath);
const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();
await page.setViewport({ width:1280, height:720, deviceScaleFactor:1 });
await page.goto(`file://${path.join(here,"anim.html")}`, { waitUntil:"networkidle0" });

const encoder = spawn(ffmpeg,["-y","-f","image2pipe","-framerate",String(fps),"-i","-","-an","-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart",path.join(here,"evolveci-silent.mp4")],{stdio:["pipe","inherit","inherit"]});
const done = new Promise((resolve,reject)=>encoder.on("close",code=>code===0?resolve():reject(new Error(`ffmpeg exited ${code}`))));

for(let frame=0;frame<fps*duration;frame++){
  await page.evaluate(t=>window.render(t),frame/fps);
  const png=await page.screenshot({type:"png"});
  if(!encoder.stdin.write(png)) await new Promise(resolve=>encoder.stdin.once("drain",resolve));
}
encoder.stdin.end();
await done;
await browser.close();
