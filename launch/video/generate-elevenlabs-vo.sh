#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_FILE="${ELEVENLABS_API_KEY_FILE:-$HOME/.claude/hooks/.elevenlabs-key}"
VOICE_ID="bIHbv24MWmeRgasZH58o"
MODEL_ID="eleven_multilingual_v2"
OUTPUT_DIR="${EVOLVECI_VIDEO_OUTPUT_DIR:-$SCRIPT_DIR}"
OUTPUT_FILE="$OUTPUT_DIR/evolveci-vo.mp3"
PAYLOAD_FILE="$OUTPUT_DIR/vo-payload.json"
METADATA_FILE="$OUTPUT_DIR/voiceover-metadata.json"
CURL_BIN="${CURL_BIN:-curl}"
FFPROBE_BIN="${FFPROBE_BIN:-ffprobe}"
INSTALL_MOVE_BIN="${INSTALL_MOVE_BIN:-mv}"

mkdir -p "$OUTPUT_DIR"

if [[ -n "${ELEVENLABS_API_KEY:-}" ]]; then
  api_key="$ELEVENLABS_API_KEY"
elif [[ -s "$KEY_FILE" ]]; then
  api_key="$(tr -d '\r\n' < "$KEY_FILE")"
else
  echo "ElevenLabs API key not found. Set ELEVENLABS_API_KEY or write it to $KEY_FILE." >&2
  exit 2
fi

if [[ ! "$api_key" =~ ^sk_[A-Za-z0-9_-]{20,}$ ]]; then
  if [[ ${#api_key} -eq 64 ]]; then
    echo "The stored ElevenLabs value looks like an API key ID, not the secret. Create a key in ElevenLabs and copy the one-time sk_ value." >&2
  else
    echo "The stored ElevenLabs value is not a current secret key. Create a new key in ElevenLabs; current secrets begin with sk_." >&2
  fi
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
    speed: 1.2,
    use_speaker_boost: true,
  },
};
fs.writeFileSync(process.env.PAYLOAD_FILE, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
NODE

response_file="$(mktemp "$OUTPUT_DIR/.vo-response.XXXXXX")"
metadata_temp="$(mktemp "$OUTPUT_DIR/.vo-metadata.XXXXXX")"
trap 'rm -f "$response_file" "$metadata_temp"' EXIT
status="$(
  printf 'header = "xi-api-key: %s"\n' "$api_key" |
    "$CURL_BIN" -q --config - -sS -o "$response_file" -w '%{http_code}' -X POST \
      --connect-timeout 15 \
      --max-time 120 \
      "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID?output_format=mp3_44100_128" \
      -H "Content-Type: application/json" \
      -H "Accept: audio/mpeg" \
      --data-binary "@$PAYLOAD_FILE"
)"
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

duration="$("$FFPROBE_BIN" -v error -show_entries format=duration -of default=nw=1:nk=1 "$response_file")"
bytes="$(wc -c < "$response_file" | tr -d ' ')"

VOICE_ID="$VOICE_ID" DURATION="$duration" BYTES="$bytes" METADATA_FILE="$metadata_temp" PAYLOAD_FILE="$PAYLOAD_FILE" NARRATION_FILE="$SCRIPT_DIR/narration.txt" OUTPUT_FILE="$response_file" node <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const payload = JSON.parse(fs.readFileSync(process.env.PAYLOAD_FILE, "utf8"));
const metadata = {
  provider: "ElevenLabs",
  voiceName: "Will",
  voiceId: process.env.VOICE_ID,
  modelId: payload.model_id,
  settings: {
    stability: payload.voice_settings.stability,
    similarityBoost: payload.voice_settings.similarity_boost,
    style: payload.voice_settings.style,
    speed: payload.voice_settings.speed,
    useSpeakerBoost: payload.voice_settings.use_speaker_boost,
  },
  durationSeconds: Number(process.env.DURATION),
  bytes: Number(process.env.BYTES),
  narrationSha256: sha256(process.env.NARRATION_FILE),
  audioSha256: sha256(process.env.OUTPUT_FILE),
  requestSha256: sha256(process.env.PAYLOAD_FILE),
};
fs.writeFileSync(process.env.METADATA_FILE, `${JSON.stringify(metadata, null, 2)}\n`);
NODE

backup_dir="$(mktemp -d "$OUTPUT_DIR/.voice-backup.XXXXXX")"
had_output=0
had_metadata=0
if [[ -e "$OUTPUT_FILE" ]]; then cp -p "$OUTPUT_FILE" "$backup_dir/output"; had_output=1; fi
if [[ -e "$METADATA_FILE" ]]; then cp -p "$METADATA_FILE" "$backup_dir/metadata"; had_metadata=1; fi
install_started=0
install_complete=0
rollback_install() {
  if [[ "$install_started" == "1" && "$install_complete" != "1" ]]; then
    if [[ "$had_output" == "1" ]]; then cp -p "$backup_dir/output" "$OUTPUT_FILE"; else rm -f "$OUTPUT_FILE"; fi
    if [[ "$had_metadata" == "1" ]]; then cp -p "$backup_dir/metadata" "$METADATA_FILE"; else rm -f "$METADATA_FILE"; fi
  fi
  rm -f "$response_file" "$metadata_temp"
  rm -rf "$backup_dir"
}
trap rollback_install EXIT
"$INSTALL_MOVE_BIN" "$response_file" "$OUTPUT_FILE"
install_started=1
"$INSTALL_MOVE_BIN" "$metadata_temp" "$METADATA_FILE"
install_complete=1
trap - EXIT
rm -rf "$backup_dir"

echo "Generated ElevenLabs voiceover: ${duration}s, ${bytes} bytes."
