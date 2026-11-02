import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "launch/README.md",
  "launch/FACT-CHECK.md",
  "launch/LAUNCH-BRIEF.md",
  "launch/blog-evolveci.md",
  "launch/blog-evolveci-substack.html",
  "launch/launch-evolveci.html",
  "launch/launch-posts.md",
  "launch/demo-script.md",
  "launch/release-copy.md",
  "launch/figures/blog-banner.png",
  "launch/video/evolveci-launch.mp4",
  "launch/video/captions.srt",
  "launch/video/generate-elevenlabs-vo.sh",
  "launch/video/music.m4a",
];

const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file));
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`);
}

if (failures.length === 0) {
  const posts = read("launch/launch-posts.md").toString("utf8").replace(/\r\n/g, "\n");
  const x = posts.split("## X")[1]?.split("## LinkedIn")[0]?.trim() ?? "";
  if ([...x].length > 280) failures.push(`X draft is ${[...x].length} characters`);

  const blog = read("launch/blog-evolveci.md").toString("utf8");
  if (blog.trim().split(/\s+/).length < 800) failures.push("canonical essay is under 800 words");

  const substack = read("launch/blog-evolveci-substack.html").toString("utf8");
  const embeddedImages = substack.match(/data:image\/png;base64/g)?.length ?? 0;
  if (embeddedImages < 3) failures.push(`Substack HTML has only ${embeddedImages} embedded figures`);
  if (substack.includes("**")) failures.push("Substack HTML contains unrendered Markdown emphasis");

  const video = read("launch/video/evolveci-launch.mp4");
  if (video.length < 500_000 || video.subarray(4, 8).toString("ascii") !== "ftyp") {
    failures.push("launch video is missing or is not a plausible MP4");
  }

  const banner = read("launch/figures/blog-banner.png");
  if (banner.readUInt32BE(16) !== 2200 || banner.readUInt32BE(20) !== 440) {
    failures.push("blog banner must render at 2200x440 (2x 1100x220)");
  }

  const captions = read("launch/video/captions.srt").toString("utf8");
  if (!captions.includes("00:01:00,000")) failures.push("caption track does not reach the 60-second ending");
}

if (failures.length > 0) {
  console.error(`Launch-kit check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Launch kit verified: copy, essay, embedded figures, banner, captions, and MP4 are present.");
