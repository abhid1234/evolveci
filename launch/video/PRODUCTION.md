# EvolveCI launch video production

The checked-in MP4 is a 60-second, 1280×720 explainer rendered from deterministic HTML canvas source. Text is burned into the scenes; [`captions.srt`](captions.srt) is included for platforms that accept a separate caption track.

## Re-render

```bash
PUPPETEER_CORE_PATH=/path/to/node_modules/puppeteer-core \
CHROME_BIN=/path/to/chrome \
bash launch/video/render.sh
```

The default voice is the local macOS `Samantha` voice. The mux applies a small pitch-preserving `atempo=1.04` adjustment so the narration ends before the 60-second master regardless of minor local speech-engine timing differences. Set `SAY_VOICE` to replace it, or swap `narration.aiff` with a human recording before the final mux. The quiet audio bed is synthesized during rendering, so no third-party music license is required.

## QA gates

- First frame is nonblank and immediately identifies the passing pull request.
- The purpose-built 1-file-versus-4-file result is labeled as a demo.
- The limitations scene says the tool does not predict a roadmap.
- The final call to action holds for seven seconds.
- `ffprobe` must report H.264 video, AAC audio, 1280×720 resolution, and a 60-second duration.
