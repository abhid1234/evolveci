import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const videoDir = process.env.EVOLVECI_VIDEO_DIR ? path.resolve(process.env.EVOLVECI_VIDEO_DIR) : path.join(root, "launch", "video");
const ffprobeBin = process.env.FFPROBE_BIN || "ffprobe";
const ffmpegBin = process.env.FFMPEG_BIN || "ffmpeg";
const narrationFile = path.join(videoDir, "narration.txt");
const voiceFile = path.join(videoDir, "evolveci-vo.mp3");
const metadataFile = path.join(videoDir, "voiceover-metadata.json");
const masterFile = path.join(videoDir, "evolveci-launch.mp4");
const musicFile = path.join(videoDir, "music.m4a");
const silentFile = path.join(videoDir, "evolveci-silent.mp4");
const failures = [];
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

for (const file of [narrationFile, voiceFile, metadataFile, masterFile, musicFile, silentFile]) {
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
    const render = metadata.render ?? {};
    if (render.voiceSha256 !== sha256(voiceFile)) failures.push("production render does not reference the current Will MP3");
    if (render.musicSha256 !== sha256(musicFile)) failures.push("production render does not reference the current music track");
    if (render.silentVideoSha256 !== sha256(silentFile)) failures.push("production render does not reference the current silent master");
    if (render.masterSha256 !== sha256(masterFile)) failures.push("production render hash does not match the checked-in MP4");
    if (!(metadata.durationSeconds > 45 && metadata.durationSeconds < 80)) {
      failures.push("voiceover duration is outside the expected range");
    } else {
      const tempo = Math.max(0.9, Math.min(1.1, metadata.durationSeconds / 64));
      const voiceEnd = 0.5 + metadata.durationSeconds / tempo;
      if (voiceEnd < 62 || voiceEnd > 65.5) {
        failures.push(`tempo-adjusted voice ends at ${voiceEnd.toFixed(2)}s; expected 62.00–65.50s`);
      }
    }
  }

  const probe = spawnSync(ffprobeBin, [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels",
    "-of", "json",
    masterFile,
  ], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    failures.push(`ffprobe failed: ${probe.error?.message ?? probe.stderr.trim()}`);
  } else {
    let media;
    try {
      media = JSON.parse(probe.stdout);
    } catch (error) {
      failures.push(`ffprobe returned invalid JSON: ${error.message}`);
    }
    if (media) {
      const duration = Number(media.format?.duration);
      const video = media.streams?.find((stream) => stream.codec_type === "video");
      const audio = media.streams?.find((stream) => stream.codec_type === "audio");
      if (!Number.isFinite(duration) || Math.abs(duration - 66) > 0.05) failures.push(`launch master duration is ${duration}, expected 66 seconds`);
      if (video?.codec_name !== "h264" || video.width !== 1280 || video.height !== 720 || video.r_frame_rate !== "24/1") {
        failures.push("launch master must be 1280x720 H.264 at 24 fps");
      }
      if (audio?.codec_name !== "aac" || audio.sample_rate !== "44100" || audio.channels !== 2) {
        failures.push("launch master must contain 44.1 kHz stereo AAC audio");
      }
    }
  }

  const volume = spawnSync(ffmpegBin, [
    "-i", masterFile,
    "-map", "0:a:0",
    "-af", "volumedetect",
    "-f", "null",
    "-",
  ], { encoding: "utf8" });
  if (volume.error || volume.status !== 0) {
    failures.push(`ffmpeg volume check failed: ${volume.error?.message ?? volume.stderr.trim()}`);
  } else {
    const mean = Number(volume.stderr.match(/mean_volume:\s*(-?[\d.]+) dB/)?.[1]);
    const peak = Number(volume.stderr.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1]);
    if (!Number.isFinite(mean) || mean < -24 || mean > -10) failures.push(`mix mean volume is ${mean} dB; expected -24 to -10 dB`);
    if (!Number.isFinite(peak) || peak < -3 || peak > -0.3) failures.push(`mix peak volume is ${peak} dB; expected -3 to -0.3 dB`);
  }
}

if (failures.length > 0) {
  console.error(`Production video check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Production video verified: ElevenLabs Will metadata, render provenance, and 66-second media master agree.");
