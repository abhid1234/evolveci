#!/usr/bin/env bash
set -euo pipefail

: "${PUPPETEER_CORE_PATH:?Set PUPPETEER_CORE_PATH to the puppeteer-core module directory}"
: "${CHROME_BIN:?Set CHROME_BIN to a Chromium executable}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FFMPEG_BIN="${FFMPEG_BIN:-ffmpeg}"
VOICE_FILE="$SCRIPT_DIR/evolveci-vo.mp3"
MUSIC_FILE="$SCRIPT_DIR/music.m4a"

if [[ ! -s "$VOICE_FILE" || "${FORCE_VO:-0}" == "1" ]]; then
  bash "$SCRIPT_DIR/generate-elevenlabs-vo.sh"
fi
[[ -s "$MUSIC_FILE" ]] || { echo "Missing shared launch music: $MUSIC_FILE" >&2; exit 2; }

PUPPETEER_CORE_PATH="$PUPPETEER_CORE_PATH" CHROME_BIN="$CHROME_BIN" FFMPEG_BIN="$FFMPEG_BIN" node "$SCRIPT_DIR/capture.mjs"

raw_duration="$($FFMPEG_BIN -v error -show_entries format=duration -of default=nw=1:nk=1 "$VOICE_FILE")"
tempo="$(RAW_DURATION="$raw_duration" node -e 'const raw=Number(process.env.RAW_DURATION); console.log(Math.max(0.9,Math.min(1.1,raw/58)).toFixed(5))')"
echo "ElevenLabs VO: ${raw_duration}s; pitch-preserving tempo: ${tempo}."

"$FFMPEG_BIN" -y \
  -i "$SCRIPT_DIR/evolveci-silent.mp4" \
  -stream_loop -1 -i "$MUSIC_FILE" \
  -i "$VOICE_FILE" \
  -filter_complex "[1:a]atrim=0:60,volume=0.7,afade=t=in:st=0:d=1.2,afade=t=out:st=57:d=3[music];[2:a]atempo=$tempo,adelay=500|500,volume=1.08[voice];[voice]asplit=2[voice_main][voice_sidechain];[music][voice_sidechain]sidechaincompress=threshold=0.05:ratio=2.6:attack=18:release=300[ducked];[ducked][voice_main]amix=inputs=2:normalize=0:duration=longest,volume=1.6,alimiter=limit=0.95,apad[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t 60 -movflags +faststart \
  "$SCRIPT_DIR/evolveci-launch.mp4"

"$FFMPEG_BIN" -y -ss 0 -i "$SCRIPT_DIR/evolveci-launch.mp4" -frames:v 1 -update 1 "$SCRIPT_DIR/qa-first-frame.png"
"$FFMPEG_BIN" -y -ss 56 -i "$SCRIPT_DIR/evolveci-launch.mp4" -frames:v 1 -update 1 "$SCRIPT_DIR/qa-cta-frame.png"

"$FFMPEG_BIN" -i "$SCRIPT_DIR/evolveci-launch.mp4" -map 0:a:0 -af volumedetect -f null - 2>&1 | grep -E 'mean_volume|max_volume'
