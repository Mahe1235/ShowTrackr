/**
 * Watch Progress — Supabase CRUD helpers for the `watch_progress` table.
 * All functions use the browser Supabase client and handle auth internally.
 */

import { createClient } from "@/lib/supabase/client";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a canonical episode key like "S1E3" */
export function episodeKey(season: number, episode: number): string {
  return `S${season}E${episode}`;
}

async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  return { supabase, user };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch all watched episodes for a show.
 * Returns a Set of episode keys like "S1E3", "S2E1", etc.
 */
export async function fetchWatchedEpisodes(
  showId: number
): Promise<Set<string>> {
  const { supabase, user } = await getUser();

  const { data, error } = await supabase
    .from("watch_progress")
    .select("season, episode")
    .eq("user_id", user.id)
    .eq("tvmaze_show_id", showId);

  if (error) {
    console.error("Failed to fetch watch progress:", error);
    return new Set();
  }

  return new Set(
    (data ?? []).map((row) => episodeKey(row.season, row.episode))
  );
}

/** Mark a single episode as watched (idempotent via upsert) */
export async function markEpisodeWatched(
  showId: number,
  season: number,
  episode: number
): Promise<void> {
  const { supabase, user } = await getUser();

  const { error } = await supabase.from("watch_progress").upsert(
    {
      user_id: user.id,
      tvmaze_show_id: showId,
      season,
      episode,
    },
    { onConflict: "user_id,tvmaze_show_id,season,episode" }
  );

  if (error) throw error;
}

/** Unmark a single episode as watched */
export async function unmarkEpisodeWatched(
  showId: number,
  season: number,
  episode: number
): Promise<void> {
  const { supabase, user } = await getUser();

  const { error } = await supabase
    .from("watch_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("tvmaze_show_id", showId)
    .eq("season", season)
    .eq("episode", episode);

  if (error) throw error;
}

/** Batch-mark an entire season as watched (idempotent via upsert) */
export async function markSeasonWatched(
  showId: number,
  episodes: { season: number; episode: number }[]
): Promise<void> {
  if (episodes.length === 0) return;
  const { supabase, user } = await getUser();

  const rows = episodes.map((ep) => ({
    user_id: user.id,
    tvmaze_show_id: showId,
    season: ep.season,
    episode: ep.episode,
  }));

  const { error } = await supabase
    .from("watch_progress")
    .upsert(rows, { onConflict: "user_id,tvmaze_show_id,season,episode" });

  if (error) throw error;
}

/** Batch-mark all released episodes as watched (used by "Mark Completed") */
export async function markAllWatched(
  showId: number,
  episodes: { season: number; episode: number }[]
): Promise<void> {
  // Same implementation as markSeasonWatched — just semantically separate
  return markSeasonWatched(showId, episodes);
}

/** Batch-unmark an entire season */
export async function unmarkSeasonWatched(
  showId: number,
  episodes: { season: number; episode: number }[]
): Promise<void> {
  if (episodes.length === 0) return;
  const { supabase, user } = await getUser();

  // Supabase doesn't support bulk delete with composite keys easily,
  // so we delete one by one. Seasons are typically <25 episodes.
  for (const ep of episodes) {
    const { error } = await supabase
      .from("watch_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("tvmaze_show_id", showId)
      .eq("season", ep.season)
      .eq("episode", ep.episode);

    if (error) throw error;
  }
}
