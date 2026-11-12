// Lists which drop-in assets "The Dot" will use before a render. Never blocks the render:
// missing music, SFX and voiceover are skipped, and a missing logo SVG falls back to the
// approved brand PNG (or a labelled grey placeholder). Run: node scripts/check-the-dot-assets.mjs
import { existsSync } from "node:fs";

const check = (path, ifMissing, level = "warn") => {
  if (existsSync(`public/${path}`)) return console.log(`  ok    public/${path}`);
  console[level](`  ${level === "error" ? "ERROR" : "WARN "} public/${path} missing: ${ifMissing}`);
};

console.log("The Dot assets:");
check("logo/monogram.svg", "using brand/alert-global-tech-monogram-ivory.png (cut from the approved wordmark)", "error");
check("logo/wordmark.svg", "using brand/alert-global-tech-wordmark-ivory.png", "error");
check("music/pulse.mp3", "rendering without music");
check("sfx/tick.wav", "rendering without cursor ticks");
check("sfx/land.wav", "rendering without the landing thud");
for (const s of [2, 3, 4, 5, 6, 7]) check(`vo/vo-s${s}.mp3`, "line skipped (npm run vo)");
