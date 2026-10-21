// Pulls unused vendor content from Supabase into data/partner-content.json (read-only).
// Run: npm run fetch
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const today = new Date().toISOString().slice(0, 10);

const { data, error } = await supabase
  .from("partner_content")
  .select(
    "id, channel, content_type, campaign_title, topic_title, topic_summary, item_title, item_description, social_post_text, email_body, link_url, used_for, date_used, reusable_from"
  )
  .or(`used.eq.false,reusable_from.lte.${today}`)
  .neq("usage_status", "skipped")
  .order("channel");

if (error) {
  console.error(error.message);
  process.exit(1);
}
// Skip rows already turned into a video
const rows = data.filter((r) => !(r.used_for ?? []).includes("video"));
writeFileSync("data/partner-content.json", JSON.stringify(rows, null, 2));
console.log(`Saved ${rows.length} rows to data/partner-content.json`);
