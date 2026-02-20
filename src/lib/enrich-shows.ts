/**
 * Shared enrichment logic for user shows.
 *
 * Fetches TMDB season metadata, computes new-season tags,
 * auto-moves completed shows, and sorts by priority.
 *
 * Used by both /my-shows and /dashboard server components.
 */

import { getShowSeasonMeta, type ShowSeasonMeta } from "@/lib/tmdb";
import type { UserShow, EnrichedUserShow } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Sort priority (lower = higher on page) ────────────────────────────────────

function getSortPriority(show: EnrichedUserShow): number {
  if (show.status === "watching") return 0;
  if (show.status === "plan_to_watch") return 1;
  if (show.status === "on_hold") return 2;
  if (show.status === "completed") return 3;
  if (show.status === "dropped") return 4;
  return 5;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Enrich user shows with TMDB metadata, auto-move completed shows,
 * and sort by priority.
 *
 * @param shows  Raw user shows from Supabase
 * @param supabase  Supabase client (for fire-and-forget DB updates)
 * @returns Enriched, sorted shows
 */
export async function enrichUserShows(
  shows: UserShow[],
  supabase: SupabaseClient
): Promise<EnrichedUserShow[]> {
  if (shows.length === 0) return [];

  // ── Fetch TMDB season metadata + user watch progress in parallel ──────

  const showIds = shows.map((s) => s.tvmaze_show_id);

  const [metaResults, watchProgressResult] = await Promise.all([
    Promise.allSettled(shows.map((s) => getShowSeasonMeta(s.tvmaze_show_id))),
    // Fetch the max watched season per show so we can skip "New Season Out"
    // for shows the user has already started watching in the latest season
    supabase
      .from("watch_progress")
      .select("tvmaze_show_id, season")
      .in("tvmaze_show_id", showIds),
  ]);

  const metaMap = new Map<number, ShowSeasonMeta>();
  metaResults.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value) {
      metaMap.set(shows[i].tvmaze_show_id, result.value);
    }
  });

  // Build a map of showId → max watched season number
  const maxWatchedSeasonMap = new Map<number, number>();
  if (watchProgressResult.data) {
    for (const row of watchProgressResult.data) {
      const current = maxWatchedSeasonMap.get(row.tvmaze_show_id) ?? 0;
      if (row.season > current) {
        maxWatchedSeasonMap.set(row.tvmaze_show_id, row.season);
      }
    }
  }

  // ── Enrich shows ────────────────────────────────────────────────────────

  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsLater = new Date(now);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  const enriched: EnrichedUserShow[] = shows.map((show) => {
    const meta = metaMap.get(show.tvmaze_show_id);
    let newSeasonTag: "soon" | "out" | null = null;
    let nextEpisodeAirDate: string | null = null;
    let hasUpcomingEpisodesInCurrentSeason = false;

    if (meta) {
      const { nextEpisode, lastEpisode, latestSeasonAirDate, numberOfSeasons } = meta;

      if (nextEpisode?.airDate) {
        nextEpisodeAirDate = nextEpisode.airDate;
        const airDate = new Date(nextEpisode.airDate + "T00:00:00");

        // "New Season Soon": next episode is in a HIGHER season and airs within 3 months
        if (lastEpisode && nextEpisode.seasonNumber > lastEpisode.seasonNumber) {
          if (airDate > now && airDate <= threeMonthsLater) {
            newSeasonTag = "soon";
          }
        }

        // Same-season upcoming episodes
        if (
          lastEpisode &&
          nextEpisode.seasonNumber === lastEpisode.seasonNumber &&
          airDate > now
        ) {
          hasUpcomingEpisodesInCurrentSeason = true;
        }
      }

      // "New Season Out": the show's latest season premiered within the last 3 months.
      // This uses the actual season air_date from TMDB's seasons array, so it only
      // triggers for genuinely recently released seasons — not old shows the user
      // is simply behind on.
      // Skip if the user has already watched episodes in the latest season
      // (they already know about it).
      if (
        newSeasonTag === null &&
        latestSeasonAirDate &&
        numberOfSeasons > 1
      ) {
        const maxWatched = maxWatchedSeasonMap.get(show.tvmaze_show_id) ?? 0;
        const alreadyWatchingLatest = maxWatched >= numberOfSeasons;

        if (!alreadyWatchingLatest) {
          const premiereDate = new Date(latestSeasonAirDate + "T00:00:00");
          if (premiereDate >= threeMonthsAgo && premiereDate <= now) {
            newSeasonTag = "out";
          }
        }
      }
    }

    return {
      ...show,
      newSeasonTag,
      nextEpisodeAirDate,
      hasUpcomingEpisodesInCurrentSeason,
    };
  });

  // ── Auto-move completed shows ──────────────────────────────────────────
  //  Only auto-move when the SAME season still has unreleased episodes,
  //  meaning the show isn't truly "completed" yet. New season tags ("soon"
  //  / "out") are purely informational — the user can decide themselves
  //  whether to continue watching a new season.

  const autoMoveToWatching: string[] = [];

  for (const show of enriched) {
    if (show.status !== "completed") continue;

    if (show.hasUpcomingEpisodesInCurrentSeason) {
      show.status = "watching";
      autoMoveToWatching.push(show.id);
    }
  }

  // Fire-and-forget DB updates — page renders immediately with corrected statuses
  if (autoMoveToWatching.length > 0) {
    supabase
      .from("user_shows")
      .update({ status: "watching" })
      .in("id", autoMoveToWatching)
      .then(({ error }) => {
        if (error) console.error("Auto-move completed→watching failed:", error);
      });
  }

  // ── Sort by priority ──────────────────────────────────────────────────

  enriched.sort((a, b) => {
    const pa = getSortPriority(a);
    const pb = getSortPriority(b);
    if (pa !== pb) return pa - pb;

    // Within the same status: sort by most recent episode air date (newest first).
    // Uses lastEpisode.airDate (most recently aired episode), falls back to
    // latestSeasonAirDate, then created_at.
    const aMeta = metaMap.get(a.tvmaze_show_id);
    const bMeta = metaMap.get(b.tvmaze_show_id);
    const aDate = aMeta?.lastEpisode?.airDate ?? aMeta?.latestSeasonAirDate ?? null;
    const bDate = bMeta?.lastEpisode?.airDate ?? bMeta?.latestSeasonAirDate ?? null;

    if (aDate && bDate) {
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    }
    // Shows with air dates sort before shows without
    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return enriched;
}
