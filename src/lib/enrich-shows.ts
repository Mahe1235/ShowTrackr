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

  // ── Fetch TMDB season metadata for all shows in parallel ────────────────

  const metaResults = await Promise.allSettled(
    shows.map((s) => getShowSeasonMeta(s.tvmaze_show_id))
  );

  const metaMap = new Map<number, ShowSeasonMeta>();
  metaResults.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value) {
      metaMap.set(shows[i].tvmaze_show_id, result.value);
    }
  });

  // ── Enrich shows ────────────────────────────────────────────────────────

  const now = new Date();
  const threeMonthsLater = new Date(now);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  const enriched: EnrichedUserShow[] = shows.map((show) => {
    const meta = metaMap.get(show.tvmaze_show_id);
    let newSeasonTag: "soon" | "out" | null = null;
    let nextEpisodeAirDate: string | null = null;
    let hasUpcomingEpisodesInCurrentSeason = false;

    if (meta) {
      const { nextEpisode, lastEpisode } = meta;

      if (nextEpisode?.airDate) {
        nextEpisodeAirDate = nextEpisode.airDate;
        const airDate = new Date(nextEpisode.airDate + "T00:00:00");

        // New season detection: next episode is in a HIGHER season
        if (lastEpisode && nextEpisode.seasonNumber > lastEpisode.seasonNumber) {
          if (airDate <= now) {
            // New season already started airing
            newSeasonTag = "out";
          } else if (airDate <= threeMonthsLater) {
            // New season coming within 3 months
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
    }

    return {
      ...show,
      newSeasonTag,
      nextEpisodeAirDate,
      hasUpcomingEpisodesInCurrentSeason,
    };
  });

  // ── Auto-move completed shows ──────────────────────────────────────────
  //  • Same-season upcoming episodes → "watching" (season isn't done yet)
  //  • New season (soon or out)      → "plan_to_watch" (user can drop if uninterested)

  const autoMoveToWatching: string[] = [];
  const autoMoveToPlanToWatch: string[] = [];

  for (const show of enriched) {
    if (show.status !== "completed") continue;

    if (show.hasUpcomingEpisodesInCurrentSeason) {
      show.status = "watching";
      autoMoveToWatching.push(show.id);
    } else if (show.newSeasonTag !== null) {
      show.status = "plan_to_watch";
      autoMoveToPlanToWatch.push(show.id);
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
  if (autoMoveToPlanToWatch.length > 0) {
    supabase
      .from("user_shows")
      .update({ status: "plan_to_watch" })
      .in("id", autoMoveToPlanToWatch)
      .then(({ error }) => {
        if (error) console.error("Auto-move completed→plan_to_watch failed:", error);
      });
  }

  // ── Sort by priority ──────────────────────────────────────────────────

  enriched.sort((a, b) => {
    const pa = getSortPriority(a);
    const pb = getSortPriority(b);
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return enriched;
}
