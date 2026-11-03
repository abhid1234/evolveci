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
  "launch/FAQ.md",
  "launch/ACCESSIBILITY.md",
  "launch/PUBLISHING-RUNBOOK.md",
  "launch/figures/blog-banner.png",
  "launch/video/evolveci-launch.mp4",
  "launch/video/anim.html",
  "launch/video/captions.srt",
  "launch/video/install-elevenlabs-key.sh",
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
  const linkedInComment = posts.split("### LinkedIn first comment")[1]?.split("## Hacker News")[0] ?? "";
  for (const expected of [
    "https://github.com/abhid1234/evolveci#run-the-deterministic-demo",
    "https://www.npmjs.com/package/@avee1234/evolveci",
    "https://github.com/abhid1234/evolveci/releases/tag/v0.1.0",
  ]) {
    if (!linkedInComment.includes(expected)) failures.push(`LinkedIn first comment is missing ${expected}`);
  }
  if (!/\{\{SUBSTACK_URL\}\}|https:\/\/abhid\.substack\.com\/p\/[a-z0-9-]+\/?/.test(linkedInComment)) {
    failures.push("LinkedIn first comment is missing a Substack placeholder or canonical URL");
  }

  const blog = read("launch/blog-evolveci.md").toString("utf8");
  if (blog.trim().split(/\s+/).length < 800) failures.push("canonical essay is under 800 words");

  const substack = read("launch/blog-evolveci-substack.html").toString("utf8");
  const embeddedImages = substack.match(/data:image\/png;base64/g)?.length ?? 0;
  if (embeddedImages < 3) failures.push(`Substack HTML has only ${embeddedImages} embedded figures`);
  if (substack.includes("**")) failures.push("Substack HTML contains unrendered Markdown emphasis");
  const installCommand = "npm install --global @avee1234/evolveci@0.1.0";
  if (!blog.includes(installCommand)) failures.push("canonical essay is missing the gated npm install command");
  if (!substack.includes(installCommand)) failures.push("Substack HTML is missing the gated npm install command");
  if (/not yet been published to npm/i.test(`${blog}\n${substack}`)) failures.push("essay still contains stale pre-publication npm copy");

  const controlRoom = read("launch/launch-evolveci.html").toString("utf8");
  for (const expected of ["video/evolveci-launch.mp4", "figures/blog-banner.png", "copy-button", "MP4 · 66s · Will VO", "npm run launch:candidate-check"]) {
    if (!controlRoom.includes(expected)) failures.push(`launch control room is missing ${expected}`);
  }
  for (const channel of [
    "<h3>X</h3>",
    "<h3>LinkedIn post</h3>",
    "<h3>LinkedIn first comment</h3>",
    "<h3>Show HN</h3>",
    "<h3>Reddit · r/LocalLLaMA</h3>",
    "<h3>Product Hunt</h3>",
    "<h3>GitHub release title</h3>",
    "<h3>GitHub release notes</h3>",
  ]) {
    if (!controlRoom.includes(channel)) failures.push(`launch control room is missing complete copy for ${channel}`);
  }
  for (const assurance of ["npm package tarball", "CycloneDX SBOM", "public-registry readback"]) {
    if (!controlRoom.includes(assurance)) failures.push(`launch control room is missing release assurance copy for ${assurance}`);
  }
  const copyButtons = controlRoom.match(/class="copy-button"/g)?.length ?? 0;
  if (copyButtons !== 8) failures.push(`launch control room has ${copyButtons} copy buttons; expected 8`);

  const releaseWorkflow = read(".github/workflows/release.yml").toString("utf8");
  for (const assurance of [
    "npm pack --ignore-scripts --json",
    "npm sbom --sbom-format cyclonedx",
    "gh release upload",
    "sbom.cdx.json#CycloneDX SBOM",
  ]) {
    if (!releaseWorkflow.includes(assurance)) failures.push(`release workflow is missing ${assurance}`);
  }

  const animation = read("launch/video/anim.html").toString("utf8");
  for (const destination of [
    "npm run demo",
    "github.com/abhid1234/evolveci",
    "npmjs.com/package/@avee1234/evolveci",
    "abhid.substack.com",
  ]) {
    if (!animation.includes(destination)) failures.push(`video CTA is missing ${destination}`);
  }
  if (/launch essay . pending|evolveci . pending/i.test(animation)) {
    failures.push("video CTA still contains a provisional destination");
  }

  const video = read("launch/video/evolveci-launch.mp4");
  if (video.length < 500_000 || video.subarray(4, 8).toString("ascii") !== "ftyp") {
    failures.push("launch video is missing or is not a plausible MP4");
  }

  const banner = read("launch/figures/blog-banner.png");
  if (banner.readUInt32BE(16) !== 2200 || banner.readUInt32BE(20) !== 440) {
    failures.push("blog banner must render at 2200x440 (2x 1100x220)");
  }

  const captions = read("launch/video/captions.srt").toString("utf8");
  if (!captions.includes("00:01:06,000")) failures.push("caption track does not reach the 66-second ending");
}

if (failures.length > 0) {
  console.error(`Launch-kit check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Launch kit verified: copy, essay, embedded figures, banner, captions, and MP4 are present.");
