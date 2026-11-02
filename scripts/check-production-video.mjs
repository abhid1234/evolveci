import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const videoDir = path.join(root, "launch", "video");
const narrationFile = path.join(videoDir, "narration.txt");
const voiceFile = path.join(videoDir, "evolveci-vo.mp3");
const metadataFile = path.join(videoDir, "voiceover-metadata.json");
const masterFile = path.join(videoDir, "evolveci-launch.mp4");
const failures = [];
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

for (const file of [narrationFile, voiceFile, metadataFile, masterFile]) {
  if (!fs.existsSync(file)) failures.push(`missing ${path.relative(root, file)}`);
}

if (failures.length === 0) {
  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
  } catch (error) {
    failures.push(`invalid voiceover metadata: ${error.message}`);
  }

  if (metadata) {
    const expected = {
      provider: "ElevenLabs",
      voiceName: "Will",
      voiceId: "bIHbv24MWmeRgasZH58o",
      modelId: "eleven_multilingual_v2",
    };
    for (const [key, value] of Object.entries(expected)) {
      if (metadata[key] !== value) failures.push(`voiceover metadata ${key} must be ${value}`);
    }
    const settings = metadata.settings ?? {};
    if (settings.stability !== 0.35 || settings.similarityBoost !== 0.8 || settings.style !== 0.35 || settings.useSpeakerBoost !== true) {
      failures.push("voiceover metadata does not match the approved Will settings");
    }
    if (metadata.narrationSha256 !== sha256(narrationFile)) failures.push("voiceover narration hash is stale");
    if (metadata.audioSha256 !== sha256(voiceFile)) failures.push("voiceover audio hash does not match the MP3");
    if (metadata.bytes !== fs.statSync(voiceFile).size) failures.push("voiceover byte count does not match the MP3");
    if (!(metadata.durationSeconds > 45 && metadata.durationSeconds < 80)) failures.push("voiceover duration is outside the expected range");
  }

  const probe = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels",
    "-of", "json",
    masterFile,
  ], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    failures.push(`ffprobe failed: ${probe.error?.message ?? probe.stderr.trim()}`);
  } else {
    const media = JSON.parse(probe.stdout);
    const duration = Number(media.format?.duration);
    const video = media.streams?.find((stream) => stream.codec_type === "video");
    const audio = media.streams?.find((stream) => stream.codec_type === "audio");
    if (Math.abs(duration - 66) > 0.05) failures.push(`launch master duration is ${duration}, expected 66 seconds`);
    if (video?.codec_name !== "h264" || video.width !== 1280 || video.height !== 720 || video.r_frame_rate !== "24/1") {
      failures.push("launch master must be 1280x720 H.264 at 24 fps");
    }
    if (audio?.codec_name !== "aac" || audio.sample_rate !== "44100" || audio.channels !== 2) {
      failures.push("launch master must contain 44.1 kHz stereo AAC audio");
    }
  }
}

if (failures.length > 0) {
  console.error(`Production video check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Production video verified: ElevenLabs Will metadata, source hashes, and 66-second media master agree.");
