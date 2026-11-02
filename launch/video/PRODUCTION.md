# EvolveCI launch video production

The checked-in MP4 is a 66-second, 1280×720 explainer rendered from deterministic HTML canvas source. Text is burned into the scenes; [`captions.srt`](captions.srt) is included for platforms that accept a separate caption track.

## Re-render

```bash
PUPPETEER_CORE_PATH=/path/to/node_modules/puppeteer-core \
CHROME_BIN=/path/to/chrome \
bash launch/video/render.sh
```

If the current narration or voice settings have changed, add `FORCE_VO=1`. A current ElevenLabs secret begins with `sk_`; an API key ID is not accepted by the service as a credential.

To create the credential, open **ElevenLabs → Developers → API keys**, create a key named `EvolveCI launch`, and copy the one-time secret value rather than the key ID shown later in the table. Store it through the checked-in validator; the secret travels over standard input rather than a command argument:

```bash
pbpaste | bash launch/video/install-elevenlabs-key.sh
```

The installer refuses the common 64-character key-ID mistake without replacing a last-good secret. It writes atomically with owner-only permissions and never prints the credential. The generator revalidates the credential before making a paid synthesis request.

The production voice is ElevenLabs **Will** (`bIHbv24MWmeRgasZH58o`) using `eleven_multilingual_v2` with stability `0.35`, similarity boost `0.8`, style `0.35`, and speaker boost enabled. [`generate-elevenlabs-vo.sh`](generate-elevenlabs-vo.sh) accepts `ELEVENLABS_API_KEY` or reads `ELEVENLABS_API_KEY_FILE` (default: `~/.claude/hooks/.elevenlabs-key`). The secret is never written to this repository.

The render measures the generated MP3 and calculates a pitch-preserving tempo adjustment against a 64-second narration target, clamped to `0.9–1.1`. It then mixes the voice with the shared launch instrumental using gentle sidechain ducking and a final limiter. Set `FORCE_VO=1` only when the narration or voice settings changed; ordinary re-renders reuse the checked-in voice track and do not spend ElevenLabs characters again. For an audio-only remux, add `SKIP_VIDEO_CAPTURE=1` to reuse `evolveci-silent.mp4`.

For layout and timing work while ElevenLabs is unavailable, [`render-local-preview.sh`](render-local-preview.sh) creates an explicitly provisional macOS system-voice cut at `evolveci-preview.mp4` through the same capture and mixing path. The preview path cannot overwrite `evolveci-launch.mp4`; re-run `render.sh` with Will before launch.

After the Will render, run `npm run launch:production-check`. It fails unless the voice metadata identifies the approved Will configuration, the narration and MP3 hashes agree, the render provenance ties that exact voice, music, and silent master to the checked-in MP4, the tempo-adjusted narration fills the final seconds, and the final master is exactly 66 seconds with the expected H.264/AAC media shape and a safe audible mix. The ordinary `npm run check` intentionally accepts a provisional preview so launch-material work can continue before the credential handoff.

Before merge or publication, run `npm run launch:candidate-check` from a clean checkout. It combines the full package release gate with this production-media gate; both must pass in the same candidate checkout.

## QA gates

- First frame is nonblank and immediately identifies the passing pull request.
- The purpose-built 1-file-versus-4-file result is labeled as a demo.
- The limitations scene says the tool does not predict a roadmap.
- The final four-destination call to action holds for thirteen seconds.
- `ffprobe` must report H.264 video, AAC audio, 1280×720 resolution, and a 66-second duration.
