#!/usr/bin/env bash
set -euo pipefail

: "${PUPPETEER_CORE_PATH:?Set PUPPETEER_CORE_PATH to the puppeteer-core module directory}"
: "${CHROME_BIN:?Set CHROME_BIN to a Chromium executable}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FFMPEG_BIN="${FFMPEG_BIN:-ffmpeg}"
FFPROBE_BIN="${FFPROBE_BIN:-ffprobe}"
DEFAULT_VOICE_FILE="$SCRIPT_DIR/evolveci-vo.mp3"
VOICE_FILE="${VOICE_FILE:-$DEFAULT_VOICE_FILE}"
VOICE_LABEL="${VOICE_LABEL:-ElevenLabs VO}"
MUSIC_FILE="$SCRIPT_DIR/music.m4a"
METADATA_FILE="$SCRIPT_DIR/voiceover-metadata.json"
DEFAULT_MASTER_FILE="$SCRIPT_DIR/evolveci-launch.mp4"
MASTER_FILE="${MASTER_FILE:-$DEFAULT_MASTER_FILE}"
QA_PREFIX="${QA_PREFIX:-qa}"

if [[ "$VOICE_FILE" != "$DEFAULT_VOICE_FILE" && "$MASTER_FILE" == "$DEFAULT_MASTER_FILE" ]]; then
  echo "A custom voice cannot overwrite the production master. Set MASTER_FILE to a preview path." >&2
  exit 2
fi

if [[ "$VOICE_FILE" == "$DEFAULT_VOICE_FILE" && "${AUTO_GENERATE_VO:-1}" == "1" && ( ! -s "$VOICE_FILE" || ! -s "$METADATA_FILE" || "${FORCE_VO:-0}" == "1" ) ]]; then
  bash "$SCRIPT_DIR/generate-elevenlabs-vo.sh"
fi
[[ -s "$VOICE_FILE" ]] || { echo "Missing voice track: $VOICE_FILE" >&2; exit 2; }
[[ -s "$MUSIC_FILE" ]] || { echo "Missing shared launch music: $MUSIC_FILE" >&2; exit 2; }

if [[ "${SKIP_VIDEO_CAPTURE:-0}" != "1" ]]; then
  PUPPETEER_CORE_PATH="$PUPPETEER_CORE_PATH" CHROME_BIN="$CHROME_BIN" FFMPEG_BIN="$FFMPEG_BIN" node "$SCRIPT_DIR/capture.mjs"
fi
[[ -s "$SCRIPT_DIR/evolveci-silent.mp4" ]] || { echo "Missing silent master. Render once without SKIP_VIDEO_CAPTURE=1." >&2; exit 2; }

raw_duration="$("$FFPROBE_BIN" -v error -show_entries format=duration -of default=nw=1:nk=1 "$VOICE_FILE")"
tempo="$(RAW_DURATION="$raw_duration" node -e 'const raw=Number(process.env.RAW_DURATION); console.log(Math.max(0.9,Math.min(1.1,raw/64)).toFixed(5))')"
echo "$VOICE_LABEL: ${raw_duration}s; pitch-preserving tempo: ${tempo}."

render_temp_dir="$(mktemp -d "$SCRIPT_DIR/.render.XXXXXX")"
master_temp="$render_temp_dir/master.mp4"
metadata_temp="$render_temp_dir/voiceover-metadata.json"
trap 'rm -rf "$render_temp_dir"' EXIT

if [[ "$VOICE_FILE" == "$DEFAULT_VOICE_FILE" && "$MASTER_FILE" == "$DEFAULT_MASTER_FILE" ]]; then
  [[ -s "$METADATA_FILE" ]] || { echo "Missing production voice metadata: $METADATA_FILE" >&2; exit 2; }
  METADATA_FILE="$METADATA_FILE" VOICE_FILE="$VOICE_FILE" node <<'NODE'
const crypto = require("node:crypto");
const fs = require("node:fs");
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const metadata = JSON.parse(fs.readFileSync(process.env.METADATA_FILE, "utf8"));
if (metadata.audioSha256 !== sha256(process.env.VOICE_FILE)) {
  throw new Error("Production voice metadata does not match the voice track being rendered.");
}
NODE
fi

"$FFMPEG_BIN" -y \
  -i "$SCRIPT_DIR/evolveci-silent.mp4" \
  -stream_loop -1 -i "$MUSIC_FILE" \
  -i "$VOICE_FILE" \
  -filter_complex "[1:a]atrim=0:66,volume=0.7,afade=t=in:st=0:d=1.2,afade=t=out:st=63:d=3[music];[2:a]atempo=$tempo,adelay=500|500,volume=1.08[voice];[voice]asplit=2[voice_main][voice_sidechain];[music][voice_sidechain]sidechaincompress=threshold=0.05:ratio=2.6:attack=18:release=300[ducked];[ducked][voice_main]amix=inputs=2:normalize=0:duration=longest,volume=1.6,alimiter=limit=0.9:level=false,apad[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t 66 -movflags +faststart \
  "$master_temp"

if [[ "$VOICE_FILE" == "$DEFAULT_VOICE_FILE" && "$MASTER_FILE" == "$DEFAULT_MASTER_FILE" ]]; then
  METADATA_FILE="$METADATA_FILE" OUTPUT_METADATA_FILE="$metadata_temp" VOICE_FILE="$VOICE_FILE" MUSIC_FILE="$MUSIC_FILE" SILENT_FILE="$SCRIPT_DIR/evolveci-silent.mp4" MASTER_FILE="$master_temp" node <<'NODE'
const crypto = require("node:crypto");
const fs = require("node:fs");
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const metadata = JSON.parse(fs.readFileSync(process.env.METADATA_FILE, "utf8"));
const voiceSha256 = sha256(process.env.VOICE_FILE);
if (metadata.audioSha256 !== voiceSha256) {
  throw new Error("Production voice metadata does not match the voice track being rendered.");
}
metadata.render = {
  voiceSha256,
  musicSha256: sha256(process.env.MUSIC_FILE),
  silentVideoSha256: sha256(process.env.SILENT_FILE),
  masterSha256: sha256(process.env.MASTER_FILE),
};
fs.writeFileSync(process.env.OUTPUT_METADATA_FILE, `${JSON.stringify(metadata, null, 2)}\n`);
NODE
fi

had_master=0
had_metadata=0
manage_metadata=0
if [[ -e "$MASTER_FILE" ]]; then cp -p "$MASTER_FILE" "$render_temp_dir/previous-master"; had_master=1; fi
if [[ -s "$metadata_temp" ]]; then
  manage_metadata=1
  if [[ -e "$METADATA_FILE" ]]; then cp -p "$METADATA_FILE" "$render_temp_dir/previous-metadata"; had_metadata=1; fi
fi
install_started=0
install_complete=0
rollback_render() {
  if [[ "$install_started" == "1" && "$install_complete" != "1" ]]; then
    if [[ "$had_master" == "1" ]]; then cp -p "$render_temp_dir/previous-master" "$MASTER_FILE"; else rm -f "$MASTER_FILE"; fi
    if [[ "$manage_metadata" == "1" ]]; then
      if [[ "$had_metadata" == "1" ]]; then cp -p "$render_temp_dir/previous-metadata" "$METADATA_FILE"; else rm -f "$METADATA_FILE"; fi
    fi
  fi
  rm -rf "$render_temp_dir"
}
trap rollback_render EXIT

mv "$master_temp" "$MASTER_FILE"
install_started=1
if [[ "$manage_metadata" == "1" ]]; then mv "$metadata_temp" "$METADATA_FILE"; fi

"$FFMPEG_BIN" -y -ss 0 -i "$MASTER_FILE" -frames:v 1 -update 1 "$SCRIPT_DIR/${QA_PREFIX}-first-frame.png"
"$FFMPEG_BIN" -y -ss 60 -i "$MASTER_FILE" -frames:v 1 -update 1 "$SCRIPT_DIR/${QA_PREFIX}-cta-frame.png"

"$FFMPEG_BIN" -i "$MASTER_FILE" -map 0:a:0 -af volumedetect -f null - 2>&1 | grep -E 'mean_volume|max_volume'

install_complete=1
trap - EXIT
rm -rf "$render_temp_dir"
