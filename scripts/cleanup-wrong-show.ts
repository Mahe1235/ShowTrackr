import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env.local
const envLines = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8").split("\n");
for (const line of envLines) {
  const eq = line.indexOf("=");
  if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
  email: "mahe_test@gmail.com",
  password: "ShowTrackr2024!",
});

if (signInError || !user) {
  console.error("Sign-in failed:", signInError?.message);
  process.exit(1);
}

console.log("Signed in as:", user.id);

// Delete the wrong show (Wives with Knives, ID 1190)
const { error: delError, count } = await supabase
  .from("user_shows")
  .delete({ count: "exact" })
  .eq("user_id", user.id)
  .eq("tvmaze_show_id", 1190);

if (delError) {
  console.error("Delete failed:", delError.message);
} else {
  console.log(`Deleted ${count} row(s) with tvmaze_show_id=1190`);
}

process.exit(0);
