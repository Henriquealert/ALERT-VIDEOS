// "The Dot" voiceover: one ElevenLabs mp3 per line into public/vo/, then a timing check.
//
//   npm run vo                      main film lines (vo-s2.mp3 ... vo-s7.mp3)
//   npm run vo -- --set network     a cut-down's lines (network | copilot | all)
//   npm run vo -- --force           regenerate files that already exist (spends credits again)
//   npm run vo -- --check           only measure existing files, no API calls
//
// Reads ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID from .env (never hard-coded, never printed).
// Line text and start frames live in src/videos/the-dot/vo-lines.ts.
// Lengths are measured with ffprobe: Remotion's getAudioDurationInSeconds() only runs in a
// browser, so the video calls it at render time (for music ducking) and this script uses ffprobe.
// If a line would run past the end of its scene the script prints the overrun in frames and
// exits with an error. Audio is never sped up or time-stretched: move the line or the cut instead.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { VO_SETS, type VoLine, type VoSetId } from "../src/videos/the-dot/vo-lines.ts";

const FPS = 30;
const OUT_DIR = "public/vo";
const MODEL = "eleven_multilingual_v2";
// Calm, confident, American English, measured pace, no upward inflection, not salesy.
const VOICE_SETTINGS = { stability: 0.55, similarity_boost: 0.75, style: 0.15 };

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const setArg = args[args.indexOf("--set") + 1];
const setIds: VoSetId[] =
  args.includes("--set") && setArg !== "all" ? [setArg as VoSetId] : args.includes("--set") ? (Object.keys(VO_SETS) as VoSetId[]) : ["main"];
for (const id of setIds) if (!(id in VO_SETS)) throw new Error(`Unknown --set "${id}". Use main, network, copilot or all.`);

// Unique files across the chosen sets (the shared S3/S4/S5/S7 lines appear once).
const lines = new Map<string, VoLine>();
for (const id of setIds) for (const l of Object.values(VO_SETS[id]) as VoLine[]) lines.set(l.file, l);

const generate = async (l: VoLine, key: string, voice: string) => {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: l.text, model_id: MODEL, voice_settings: VOICE_SETTINGS }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status} for ${l.file}: ${(await res.text()).slice(0, 300)}`);
  writeFileSync(join(OUT_DIR, l.file), Buffer.from(await res.arrayBuffer()));
  console.log(`  wrote ${OUT_DIR}/${l.file}  "${l.text}"`);
};

const seconds = (file: string) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

const main = async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  if (!flag("check")) {
    const key = process.env.ELEVENLABS_API_KEY;
    const voice = process.env.ELEVENLABS_VOICE_ID;
    if (!key || !voice) throw new Error("Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env (see .env.example).");
    for (const l of lines.values()) {
      if (existsSync(join(OUT_DIR, l.file)) && !flag("force")) {
        console.log(`  kept ${OUT_DIR}/${l.file} (use --force to regenerate)`);
        continue;
      }
      await generate(l, key, voice);
    }
  }

  console.log("\nTiming (30 fps):");
  let failed = false;
  for (const l of lines.values()) {
    const path = join(OUT_DIR, l.file);
    if (!existsSync(path)) {
      console.log(`  ${l.file.padEnd(22)} missing`);
      failed = true;
      continue;
    }
    const frames = Math.ceil(seconds(path) * FPS);
    const end = l.from + frames;
    const over = end - l.sceneEnd;
    console.log(`  ${l.file.padEnd(22)} frames ${l.from}-${end} (scene ends ${l.sceneEnd})${over > 0 ? `  OVERRUN by ${over} frames` : ""}`);
    if (over > 0) failed = true;
  }
  if (failed) {
    console.error("\nOne or more lines are missing or run past their scene. Adjust the timing in vo-lines.ts / timeline.ts; do not time-stretch the audio.");
    process.exit(1);
  }
  console.log("\nAll lines fit their scenes.");
};

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
