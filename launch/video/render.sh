#!/usr/bin/env bash
set -euo pipefail

: "${PUPPETEER_CORE_PATH:?Set PUPPETEER_CORE_PATH to the puppeteer-core module directory}"
: "${CHROME_BIN:?Set CHROME_BIN to a Chromium executable}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FFMPEG_BIN="${FFMPEG_BIN:-ffmpeg}"
SAY_VOICE="${SAY_VOICE:-Samantha}"

say -v "$SAY_VOICE" -r 160 -f "$SCRIPT_DIR/narration.txt" -o "$SCRIPT_DIR/narration.aiff"
PUPPETEER_CORE_PATH="$PUPPETEER_CORE_PATH" CHROME_BIN="$CHROME_BIN" FFMPEG_BIN="$FFMPEG_BIN" node "$SCRIPT_DIR/capture.mjs"

"$FFMPEG_BIN" -y \
  -i "$SCRIPT_DIR/evolveci-silent.mp4" \
  -i "$SCRIPT_DIR/narration.aiff" \
  -f lavfi -t 60 -i "sine=frequency=110:sample_rate=48000" \
  -filter_complex "[1:a]atempo=1.04,volume=1.08[voice];[2:a]volume=0.012,afade=t=in:st=0:d=2,afade=t=out:st=57:d=3[bed];[voice][bed]amix=inputs=2:duration=longest[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t 60 -movflags +faststart \
  "$SCRIPT_DIR/evolveci-launch.mp4"

"$FFMPEG_BIN" -y -ss 0 -i "$SCRIPT_DIR/evolveci-launch.mp4" -frames:v 1 -update 1 "$SCRIPT_DIR/qa-first-frame.png"
"$FFMPEG_BIN" -y -ss 56 -i "$SCRIPT_DIR/evolveci-launch.mp4" -frames:v 1 -update 1 "$SCRIPT_DIR/qa-cta-frame.png"
