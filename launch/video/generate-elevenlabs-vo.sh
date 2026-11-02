#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_FILE="${ELEVENLABS_API_KEY_FILE:-/Users/abhijitdas/.claude/hooks/.elevenlabs-key}"
VOICE_ID="${ELEVENLABS_VOICE_ID:-bIHbv24MWmeRgasZH58o}"
MODEL_ID="eleven_multilingual_v2"
OUTPUT_FILE="$SCRIPT_DIR/evolveci-vo.mp3"
PAYLOAD_FILE="$SCRIPT_DIR/vo-payload.json"
METADATA_FILE="$SCRIPT_DIR/voiceover-metadata.json"

if [[ -n "${ELEVENLABS_API_KEY:-}" ]]; then
  api_key="$ELEVENLABS_API_KEY"
elif [[ -s "$KEY_FILE" ]]; then
  api_key="$(tr -d '\r\n' < "$KEY_FILE")"
else
  echo "ElevenLabs API key not found. Set ELEVENLABS_API_KEY or write it to $KEY_FILE." >&2
  exit 2
fi

if [[ "$api_key" != sk_* ]]; then
  echo "The stored ElevenLabs value is not a current secret key. Create a new key in ElevenLabs; current secrets begin with sk_." >&2
  exit 2
fi

umask 077
NARRATION_FILE="$SCRIPT_DIR/narration.txt" PAYLOAD_FILE="$PAYLOAD_FILE" MODEL_ID="$MODEL_ID" node <<'NODE'
const fs = require("node:fs");
const text = fs.readFileSync(process.env.NARRATION_FILE, "utf8").trim();
const payload = {
  text,
  model_id: process.env.MODEL_ID,
  voice_settings: {
    stability: 0.35,
    similarity_boost: 0.8,
    style: 0.35,
    use_speaker_boost: true,
  },
};
fs.writeFileSync(process.env.PAYLOAD_FILE, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
NODE

response_file="$(mktemp "$SCRIPT_DIR/.vo-response.XXXXXX")"
trap 'rm -f "$response_file"' EXIT
status="$(curl -sS -o "$response_file" -w '%{http_code}' -X POST \
  --connect-timeout 15 \
  --max-time 120 \
  "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID?output_format=mp3_44100_128" \
  -H "xi-api-key: $api_key" \
  -H "Content-Type: application/json" \
  -H "Accept: audio/mpeg" \
  --data-binary "@$PAYLOAD_FILE")"
unset api_key

if [[ "$status" != "200" ]]; then
  RESPONSE_FILE="$response_file" STATUS="$status" node <<'NODE' >&2
const fs = require("node:fs");
let body = {};
try { body = JSON.parse(fs.readFileSync(process.env.RESPONSE_FILE, "utf8")); } catch {}
const detail = body.detail?.message ?? body.detail ?? body.message ?? "non-JSON response";
console.error(`ElevenLabs request failed (HTTP ${process.env.STATUS}): ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
NODE
  exit 3
fi

mv "$response_file" "$OUTPUT_FILE"
trap - EXIT
duration="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUTPUT_FILE")"
bytes="$(wc -c < "$OUTPUT_FILE" | tr -d ' ')"

VOICE_ID="$VOICE_ID" MODEL_ID="$MODEL_ID" DURATION="$duration" BYTES="$bytes" METADATA_FILE="$METADATA_FILE" NARRATION_FILE="$SCRIPT_DIR/narration.txt" OUTPUT_FILE="$OUTPUT_FILE" node <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const metadata = {
  provider: "ElevenLabs",
  voiceName: "Will",
  voiceId: process.env.VOICE_ID,
  modelId: process.env.MODEL_ID,
  settings: { stability: 0.35, similarityBoost: 0.8, style: 0.35, useSpeakerBoost: true },
  durationSeconds: Number(process.env.DURATION),
  bytes: Number(process.env.BYTES),
  narrationSha256: sha256(process.env.NARRATION_FILE),
  audioSha256: sha256(process.env.OUTPUT_FILE),
};
fs.writeFileSync(process.env.METADATA_FILE, `${JSON.stringify(metadata, null, 2)}\n`);
NODE

echo "Generated ElevenLabs voiceover: ${duration}s, ${bytes} bytes."
