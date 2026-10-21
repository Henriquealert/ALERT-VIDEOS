// Checks a spec file against VideoSpec before preview or render.
// Run: npm run validate-spec -- data/specs/<slug>.json
import { readFileSync } from "node:fs";
import { VideoSpec } from "../src/spec.ts";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run validate-spec -- data/specs/<slug>.json");
  process.exit(1);
}
const result = VideoSpec.safeParse(JSON.parse(readFileSync(file, "utf8")));
if (!result.success) {
  for (const issue of result.error.issues) console.error(`${issue.path.join(".") || "(root)"}: ${issue.message}`);
  process.exit(1);
}
console.log(`${file} is a valid VideoSpec.`);
