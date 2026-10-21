// Marks one partner_content row as used for video. Run only after the render is approved.
// Run: npm run mark-used -- <row id>
import { createClient } from "@supabase/supabase-js";

const id = process.argv[2];
if (!id) {
  console.error("Usage: npm run mark-used -- <row id>");
  process.exit(1);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: row, error: readErr } = await supabase
  .from("partner_content").select("used_for").eq("id", id).single();
if (readErr) {
  console.error(readErr.message);
  process.exit(1);
}

const usedFor = Array.from(new Set([...(row.used_for ?? []), "video"]));
const { error } = await supabase
  .from("partner_content")
  .update({
    used: true,
    used_for: usedFor,
    date_used: new Date().toISOString().slice(0, 10),
    usage_status: "published",
  })
  .eq("id", id);
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Marked ${id} as used for video.`);
