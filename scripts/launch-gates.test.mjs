import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = process.cwd();
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const validTestSecret = `sk_${"x".repeat(32)}`;
const run = (command, args, env = {}, options = {}) => spawnSync(command, args, {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, ...env },
  ...options,
});

async function executable(file, source) {
  await writeFile(file, source, { mode: 0o700 });
}

test("ElevenLabs generation keeps the secret out of curl argv", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "evolveci-voice-safety-"));
  try {
    const curl = path.join(directory, "curl-shim");
    const ffprobe = path.join(directory, "ffprobe-shim");
    const argsFile = path.join(directory, "curl-args.txt");
    const configFile = path.join(directory, "curl-config.txt");
    await executable(curl, `#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$@" > "$FAKE_CURL_ARGS"
cat > "$FAKE_CURL_CONFIG"
output=""
while [[ $# -gt 0 ]]; do
  if [[ "$1" == "-o" ]]; then output="$2"; shift 2; else shift; fi
done
printf 'fake-mp3' > "$output"
printf '200'
`);
    await executable(ffprobe, "#!/usr/bin/env bash\nprintf '64.0\\n'\n");
    const secret = validTestSecret;
    const result = run("bash", ["launch/video/generate-elevenlabs-vo.sh"], {
      ELEVENLABS_API_KEY: secret,
      EVOLVECI_VIDEO_OUTPUT_DIR: directory,
      CURL_BIN: curl,
      FFPROBE_BIN: ffprobe,
      FAKE_CURL_ARGS: argsFile,
      FAKE_CURL_CONFIG: configFile,
    });
    assert.equal(result.status, 0, result.stderr);
    const argv = await readFile(argsFile, "utf8");
    const curlConfig = await readFile(configFile, "utf8");
    assert.equal(argv.split("\n")[0], "-q");
    assert.doesNotMatch(argv, new RegExp(`${secret}|xi-api-key`, "i"));
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(secret));
    assert.match(curlConfig, new RegExp(`xi-api-key: ${secret}`));
    assert.doesNotMatch(await readFile(path.join(directory, "voiceover-metadata.json"), "utf8"), new RegExp(secret));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("voice generation rolls back both artifacts when installation is interrupted", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "evolveci-voice-rollback-"));
  try {
    const curl = path.join(directory, "curl-shim");
    const ffprobe = path.join(directory, "ffprobe-shim");
    const move = path.join(directory, "move-shim");
    const counter = path.join(directory, "move-count");
    const oldVoice = Buffer.from("last-known-good-voice");
    const oldMetadata = Buffer.from('{"lastKnownGood":true}\n');
    await writeFile(path.join(directory, "evolveci-vo.mp3"), oldVoice);
    await writeFile(path.join(directory, "voiceover-metadata.json"), oldMetadata);
    await executable(curl, `#!/usr/bin/env bash
set -euo pipefail
cat >/dev/null
output=""
while [[ $# -gt 0 ]]; do
  if [[ "$1" == "-o" ]]; then output="$2"; shift 2; else shift; fi
done
printf 'new-paid-voice' > "$output"
printf '200'
`);
    await executable(ffprobe, "#!/usr/bin/env bash\nprintf '64.0\\n'\n");
    await executable(move, `#!/usr/bin/env bash
set -euo pipefail
count=0
[[ -f "$MOVE_COUNTER" ]] && count=$(cat "$MOVE_COUNTER")
count=$((count + 1))
printf '%s' "$count" > "$MOVE_COUNTER"
[[ "$count" == "2" ]] && exit 88
/bin/mv "$@"
`);
    const result = run("bash", ["launch/video/generate-elevenlabs-vo.sh"], {
      ELEVENLABS_API_KEY: validTestSecret,
      EVOLVECI_VIDEO_OUTPUT_DIR: directory,
      CURL_BIN: curl,
      FFPROBE_BIN: ffprobe,
      INSTALL_MOVE_BIN: move,
      MOVE_COUNTER: counter,
    });
    assert.equal(result.status, 88);
    assert.deepEqual(await readFile(path.join(directory, "evolveci-vo.mp3")), oldVoice);
    assert.deepEqual(await readFile(path.join(directory, "voiceover-metadata.json")), oldMetadata);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a custom voice cannot trigger paid generation or overwrite the production master", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "evolveci-custom-voice-"));
  try {
    const marker = path.join(directory, "curl-was-called");
    const curl = path.join(directory, "curl-shim");
    await executable(curl, `#!/usr/bin/env bash\ntouch "$FAKE_CURL_MARKER"\nexit 99\n`);
    const result = run("bash", ["launch/video/render.sh"], {
      PUPPETEER_CORE_PATH: directory,
      CHROME_BIN: path.join(directory, "chrome"),
      VOICE_FILE: path.join(directory, "missing-custom-voice.mp3"),
      AUTO_GENERATE_VO: "1",
      ELEVENLABS_API_KEY: validTestSecret,
      CURL_BIN: curl,
      FAKE_CURL_MARKER: marker,
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /custom voice cannot overwrite the production master/i);
    await assert.rejects(() => readFile(marker), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a failed preview QA restores the previous preview master", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "evolveci-render-rollback-"));
  try {
    const voice = path.join(directory, "preview-voice.aiff");
    const master = path.join(directory, "preview.mp4");
    const ffprobe = path.join(directory, "ffprobe-shim");
    const ffmpeg = path.join(directory, "ffmpeg-shim");
    const counter = path.join(directory, "ffmpeg-count");
    const oldMaster = Buffer.from("last-known-good-preview");
    await writeFile(voice, "preview voice");
    await writeFile(master, oldMaster);
    await executable(ffprobe, "#!/usr/bin/env bash\nprintf '64.0\\n'\n");
    await executable(ffmpeg, `#!/usr/bin/env bash
set -euo pipefail
count=0
[[ -f "$FFMPEG_COUNTER" ]] && count=$(cat "$FFMPEG_COUNTER")
count=$((count + 1))
printf '%s' "$count" > "$FFMPEG_COUNTER"
if [[ "$count" == "1" ]]; then
  for argument in "$@"; do output="$argument"; done
  printf 'new-preview' > "$output"
  exit 0
fi
exit 77
`);
    const result = run("bash", ["launch/video/render.sh"], {
      PUPPETEER_CORE_PATH: directory,
      CHROME_BIN: path.join(directory, "chrome"),
      SKIP_VIDEO_CAPTURE: "1",
      AUTO_GENERATE_VO: "0",
      VOICE_FILE: voice,
      MASTER_FILE: master,
      FFPROBE_BIN: ffprobe,
      FFMPEG_BIN: ffmpeg,
      FFMPEG_COUNTER: counter,
    });
    assert.equal(result.status, 77);
    assert.deepEqual(await readFile(master), oldMaster);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

async function writeVideoFixture(directory) {
  const files = {
    narration: Buffer.from("Launch narration"),
    voice: Buffer.from("Will voice"),
    music: Buffer.from("Music"),
    silent: Buffer.from("Silent video"),
    master: Buffer.from("Rendered master"),
  };
  await writeFile(path.join(directory, "narration.txt"), files.narration);
  await writeFile(path.join(directory, "evolveci-vo.mp3"), files.voice);
  await writeFile(path.join(directory, "music.m4a"), files.music);
  await writeFile(path.join(directory, "evolveci-silent.mp4"), files.silent);
  await writeFile(path.join(directory, "evolveci-launch.mp4"), files.master);
  const metadata = {
    provider: "ElevenLabs",
    voiceName: "Will",
    voiceId: "bIHbv24MWmeRgasZH58o",
    modelId: "eleven_multilingual_v2",
    settings: { stability: 0.35, similarityBoost: 0.8, style: 0.35, useSpeakerBoost: true },
    durationSeconds: 64,
    bytes: files.voice.length,
    narrationSha256: sha256(files.narration),
    audioSha256: sha256(files.voice),
    render: {
      voiceSha256: sha256(files.voice),
      musicSha256: sha256(files.music),
      silentVideoSha256: sha256(files.silent),
      masterSha256: sha256(files.master),
    },
  };
  await writeFile(path.join(directory, "voiceover-metadata.json"), `${JSON.stringify(metadata)}\n`);
}

async function videoGateFixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "evolveci-video-gate-"));
  await writeVideoFixture(directory);
  const ffprobe = path.join(directory, "ffprobe-shim.mjs");
  const ffmpeg = path.join(directory, "ffmpeg-shim.mjs");
  await writeFile(ffprobe, "process.stdout.write(`${process.env.FAKE_PROBE_JSON}\\n`);\n");
  await writeFile(ffmpeg, "process.stderr.write('mean_volume: -14.0 dB\\nmax_volume: -0.7 dB\\n');\n");
  const validProbe = JSON.stringify({
    format: { duration: "66.000" },
    streams: [
      { codec_type: "video", codec_name: "h264", width: 1280, height: 720, r_frame_rate: "24/1" },
      { codec_type: "audio", codec_name: "aac", sample_rate: "44100", channels: 2 },
    ],
  });
  const validate = (probe = validProbe) => run(process.execPath, ["scripts/check-production-video.mjs"], {
    EVOLVECI_VIDEO_DIR: directory,
    FFPROBE_BIN: process.execPath,
    FFMPEG_BIN: process.execPath,
    FFPROBE_ARGS_PREFIX: JSON.stringify([ffprobe]),
    FFMPEG_ARGS_PREFIX: JSON.stringify([ffmpeg]),
    FAKE_PROBE_JSON: probe,
  });
  return { directory, validate };
}

test("production video gate binds the checked master to the Will render", async () => {
  const fixture = await videoGateFixture();
  try {
    const passing = fixture.validate();
    assert.equal(passing.status, 0, passing.stderr);
    await writeFile(path.join(fixture.directory, "evolveci-launch.mp4"), "different master");
    const stale = fixture.validate();
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /render hash does not match/);
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("production video gate fails cleanly on malformed probe output", async () => {
  const fixture = await videoGateFixture();
  try {
    const result = fixture.validate("not-json");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ffprobe returned invalid JSON/);
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("public launch gate requires explicit positive readback states", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "evolveci-public-gate-"));
  try {
    const factCheck = path.join(directory, "FACT-CHECK.md");
    const surfaces = new Map([
      ["Code", "https://github.com/abhid1234/evolveci"],
      ["CI proof", "https://github.com/abhid1234/evolveci/pull/5/checks"],
      ["npm", "https://www.npmjs.com/package/@avee1234/evolveci"],
      ["GitHub release", "https://github.com/abhid1234/evolveci/releases/tag/v0.1.0"],
      ["Demo / playground", "https://github.com/abhid1234/evolveci#run-the-deterministic-demo"],
      ["Substack", "https://abhid.substack.com/p/evolveci-launch"],
    ]);
    const writeManifest = async (state) => {
      const rows = [...surfaces].map(([surface, url]) => `| ${surface} | ${url} | ${state} |`).join("\n");
      await writeFile(factCheck, `| Surface | URL | Current state |\n|---|---|---|\n${rows}\n`);
    };
    for (const state of ["Draft", "Unverified", "Needs readback", "Pending"]) {
      await writeManifest(state);
      const result = run(process.execPath, ["scripts/check-public-launch-manifest.mjs"], { EVOLVECI_FACT_CHECK_FILE: factCheck });
      assert.equal(result.status, 1, `state ${state} must fail`);
    }
    await writeManifest("LIVE_VERIFIED: signed-out readback complete");
    const passing = run(process.execPath, ["scripts/check-public-launch-manifest.mjs"], { EVOLVECI_FACT_CHECK_FILE: factCheck });
    assert.equal(passing.status, 0, passing.stderr);
    await writeFile(factCheck, (await readFile(factCheck, "utf8")).replace("https://github.com/abhid1234/evolveci", "https://example.test/evolveci"));
    const wrongHost = run(process.execPath, ["scripts/check-public-launch-manifest.mjs"], { EVOLVECI_FACT_CHECK_FILE: factCheck });
    assert.equal(wrongHost.status, 1);
    assert.match(wrongHost.stderr, /canonical launch URL/);
    await writeManifest("LIVE_VERIFIED: signed-out readback complete");
    await writeFile(factCheck, `${await readFile(factCheck, "utf8")}| Code | https://example.test/duplicate | LIVE_VERIFIED: duplicate |\n`);
    const duplicate = run(process.execPath, ["scripts/check-public-launch-manifest.mjs"], { EVOLVECI_FACT_CHECK_FILE: factCheck });
    assert.equal(duplicate.status, 1);
    assert.match(duplicate.stderr, /duplicate Code row/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("credential installer is atomic, owner-only, and rejects key IDs", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "evolveci-key-install-"));
  const keyFile = path.join(directory, "elevenlabs-key");
  try {
    await writeFile(keyFile, "last-good-secret\n", { mode: 0o600 });
    const rejected = run("bash", ["launch/video/install-elevenlabs-key.sh"], {
      ELEVENLABS_API_KEY_FILE: keyFile,
    }, { input: `${"i".repeat(64)}\n` });
    assert.equal(rejected.status, 2);
    assert.match(rejected.stderr, /API key ID/);
    assert.equal(await readFile(keyFile, "utf8"), "last-good-secret\n");

    const installed = run("bash", ["launch/video/install-elevenlabs-key.sh"], {
      ELEVENLABS_API_KEY_FILE: keyFile,
    }, { input: `${validTestSecret}\n` });
    assert.equal(installed.status, 0, installed.stderr);
    assert.doesNotMatch(`${installed.stdout}${installed.stderr}`, new RegExp(validTestSecret));
    assert.equal(await readFile(keyFile, "utf8"), `${validTestSecret}\n`);
    if (process.platform !== "win32") {
      assert.equal((await stat(keyFile)).mode & 0o777, 0o600);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
