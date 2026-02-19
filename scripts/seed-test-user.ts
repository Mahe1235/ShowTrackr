/**
 * Seed script: creates the mahe_test user and adds 3 shows to their watchlist.
 *
 * Run: npx tsx scripts/seed-test-user.ts
 *
 * Test credentials:
 *   Email:    mahe_test@showtrackr.dev
 *   Password: ShowTrackr2024!
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// ── Load .env.local ────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

// ── Config ─────────────────────────────────────────────────────────────────
const TEST_EMAIL = "mahe_test@gmail.com";
const TEST_PASSWORD = "ShowTrackr2024!";

const SHOWS = [
  { tvmaze_id: 82,   name: "Game of Thrones" },
  { tvmaze_id: 172,  name: "Suits"           },
  { tvmaze_id: 431,  name: "Friends"         },
] as const;

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Step 1: Sign up or sign in the test user
  let userId: string;

  console.log(`Creating / signing in test user: ${TEST_EMAIL}`);

  // Always try sign-in first (handles confirmed users + re-runs)
  const { data: signInFirst, error: signInFirstError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (!signInFirstError && signInFirst.user) {
    userId = signInFirst.user.id;
    console.log("Signed in as existing user:", userId);
  } else {
    // Sign in failed — attempt sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (signUpError) {
      console.error("Sign-up failed:", signUpError.message);
      process.exit(1);
    } else if (signUpData.user && signUpData.session) {
      userId = signUpData.user.id;
      console.log("New user created and signed in:", userId);
    } else if (signUpData.user && !signUpData.session) {
      console.error(
        "\nEmail confirmation is enabled in your Supabase project.\n" +
        "Please disable it:\n" +
        "  1. Go to https://supabase.com/dashboard/project/dehcamweidggyqebqxqs\n" +
        "  2. Authentication → Providers → Email\n" +
        "  3. Toggle OFF 'Confirm email'\n" +
        "  4. Re-run this script.\n"
      );
      process.exit(1);
    } else {
      console.error("Unexpected sign-up response");
      process.exit(1);
    }
  }

  console.log(`Authenticated as user: ${userId}\n`);

  // Step 2: Fetch show details from TVMaze and upsert
  for (const show of SHOWS) {
    process.stdout.write(`Fetching ${show.name} from TVMaze… `);
    const res = await fetch(`https://api.tvmaze.com/shows/${show.tvmaze_id}`);
    if (!res.ok) {
      console.log(`FAILED (HTTP ${res.status})`);
      continue;
    }
    const tvData = await res.json() as {
      name: string;
      image?: { medium?: string; original?: string } | null;
    };

    const poster = tvData.image?.medium ?? tvData.image?.original ?? null;
    const backdrop = tvData.image?.original ?? tvData.image?.medium ?? null;

    const { error: upsertError } = await supabase.from("user_shows").upsert(
      {
        user_id:        userId,
        tvmaze_show_id: show.tvmaze_id,
        show_name:      tvData.name,
        show_poster:    poster,
        show_backdrop:  backdrop,
        status:         "watching",
      },
      { onConflict: "user_id,tvmaze_show_id" }
    );

    if (upsertError) {
      console.log(`FAILED — ${upsertError.message}`);
    } else {
      console.log("OK");
    }
  }

  console.log("\nDone!");
  console.log(`  Email:    ${TEST_EMAIL}  (use this to sign in)`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
