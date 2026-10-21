// Fails if anything other than the brand fonts could reach the screen.
// Allowed: Archivo Narrow, DM Sans, Instrument Serif (public/fonts/, as supplied).
// Run: npm run check-fonts (also part of npm run typecheck)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ALLOWED = ["Archivo Narrow", "DM Sans", "Instrument Serif"];
const problems = [];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// 1. Font files: only the three supplied family folders.
for (const file of walk("public/fonts").filter((f) => !/README\.md$/.test(f))) {
  const family = file.split(/[\\/]/)[2];
  if (!ALLOWED.includes(family)) problems.push(`${file}: not in a brand font folder`);
}

// 2. Code: every fontFamily goes through F, and F/FONT_FILES name only allowed families.
for (const file of walk("src").filter((f) => /\.(tsx?|css)$/.test(f))) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    const ff = line.match(/fontFamily\s*[:=]\s*([^,}\n]+)/);
    if (ff && !/^F\.\w+/.test(ff[1].trim())) problems.push(`${at}: fontFamily must use F.* (${ff[1].trim()})`);
    if (/font-family|@font-face|google-fonts|fonts\.googleapis/i.test(line)) problems.push(`${at}: load fonts only via theme.tsx`);
  });
  if (file.endsWith("theme.tsx")) {
    const names = [...readFileSync(file, "utf8").matchAll(/["']([A-Z][A-Za-z ]+)["']/g)].map((m) => m[1]);
    const fontLike = names.filter((n) => /Sans|Serif|Mono|Narrow|Archivo|Inter|Silkscreen|Arial|Helvetica|Georgia/.test(n));
    for (const n of fontLike) if (!ALLOWED.includes(n)) problems.push(`${file}: "${n}" is not a brand font`);
  }
}

if (problems.length) {
  console.error(`Font check failed:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`Font check passed: only ${ALLOWED.join(", ")}.`);
