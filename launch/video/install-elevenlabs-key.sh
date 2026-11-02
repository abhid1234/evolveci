#!/usr/bin/env bash
set -euo pipefail

KEY_FILE="${ELEVENLABS_API_KEY_FILE:-$HOME/.claude/hooks/.elevenlabs-key}"

if [[ -t 0 ]]; then
  printf 'Paste the one-time ElevenLabs sk_ secret (input hidden): ' >&2
fi
IFS= read -r -s api_key || true
if [[ -t 0 ]]; then printf '\n' >&2; fi

if [[ ! "$api_key" =~ ^sk_[A-Za-z0-9_-]{20,}$ ]]; then
  if [[ ${#api_key} -eq 64 ]]; then
    echo "Refusing to store an API key ID. Create a new ElevenLabs key and copy its one-time sk_ secret." >&2
  else
    echo "Refusing to store an invalid credential. Current ElevenLabs secrets begin with sk_." >&2
  fi
  unset api_key
  exit 2
fi

umask 077
mkdir -p "$(dirname "$KEY_FILE")"
temp_file="$(mktemp "${KEY_FILE}.tmp.XXXXXX")"
trap 'rm -f "$temp_file"' EXIT
printf '%s\n' "$api_key" > "$temp_file"
unset api_key
chmod 600 "$temp_file"
mv "$temp_file" "$KEY_FILE"
trap - EXIT

echo "Stored the ElevenLabs secret with owner-only permissions at $KEY_FILE."
