#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_VOICE_FILE="$SCRIPT_DIR/narration.aiff"

if [[ ! -s "$LOCAL_VOICE_FILE" || "${FORCE_LOCAL_VO:-0}" == "1" ]]; then
  /usr/bin/say \
    -v "${LOCAL_VOICE:-Samantha}" \
    -r "${LOCAL_RATE:-175}" \
    -f "$SCRIPT_DIR/narration.txt" \
    -o "$LOCAL_VOICE_FILE"
fi

AUTO_GENERATE_VO=0 \
VOICE_FILE="$LOCAL_VOICE_FILE" \
VOICE_LABEL="Local preview VO" \
MASTER_FILE="$SCRIPT_DIR/evolveci-preview.mp4" \
QA_PREFIX="qa-preview" \
bash "$SCRIPT_DIR/render.sh"

echo "Rendered launch/video/evolveci-preview.mp4 with a provisional local voice. The production master was not modified."
