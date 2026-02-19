import { createClient } from "@/lib/supabase/server";
import { getShowSeasonMeta, type ShowSeasonMeta } from "@/lib/tmdb";
import type { UserShow, EnrichedUserShow } from "@/types";
import MyShowsView from "./MyShowsView";

// ── Sort priority (lower = higher on page) ────────────────────────────────────

function getSortPriority(show: EnrichedUserShow): number {
  if (show.status === "watching") return 0;
  if (show.status === "plan_to_watch") return 1;
  if (show.status === "on_hold") return 2;
  if (show.status === "completed") return 3;
  if (show.status === "dropped") return 4;
  return 5;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function MyShowsPage() {
  const supabase = await createClient();

  // getUser() re-validates with the Auth server — safe, does not trust client JWT alone.
  // Returns null user (not an error) when not logged in.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let shows: UserShow[] = [];

  if (user) {
    const { data } = await supabase
      .from("user_shows")
      .select("*")
      .order("created_at", { ascending: false });

    // Supabase returns any[] without generated DB types — cast to UserShow[]
    // which exactly matches the schema columns.
    shows = (data as UserShow[]) ?? [];
  }

  // No shows → skip TMDB enrichment entirely
  if (shows.length === 0) {
    return <MyShowsView initialShows={[]} isLoggedIn={!!user} />;
  }

  // ── Fetch TMDB season metadata for all shows in parallel ──────────────────

  const metaResults = await Promise.allSettled(
    shows.map((s) => getShowSeasonMeta(s.tvmaze_show_id))
  );

  const metaMap = new Map<number, ShowSeasonMeta>();
  metaResults.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value) {
      metaMap.set(shows[i].tvmaze_show_id, result.value);
    }
  });

  // ── Enrich shows ──────────────────────────────────────────────────────────

  const now = new Date();
  const threeMonthsLater = new Date(now);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  const enriched: EnrichedUserShow[] = shows.map((show) => {
    const meta = metaMap.get(show.tvmaze_show_id);
    let newSeasonComingSoon = false;
    let nextEpisodeAirDate: string | null = null;
    let hasUpcomingEpisodesInCurrentSeason = false;

    if (meta) {
      const { nextEpisode, lastEpisode } = meta;

      if (nextEpisode?.airDate) {
        nextEpisodeAirDate = nextEpisode.airDate;
        const airDate = new Date(nextEpisode.airDate + "T00:00:00");

        // "New season coming soon": next episode is in a HIGHER season than
        // the last aired episode, and airs within 3 months
        if (
          lastEpisode &&
          nextEpisode.seasonNumber > lastEpisode.seasonNumber &&
          airDate > now &&
          airDate <= threeMonthsLater
        ) {
          newSeasonComingSoon = true;
        }

        // "Upcoming episodes in current season": next episode is in the SAME
        // season as the last aired episode and hasn't aired yet
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
      newSeasonComingSoon,
      nextEpisodeAirDate,
      hasUpcomingEpisodesInCurrentSeason,
    };
  });

  // ── Auto-move completed shows ──────────────────────────────────────────────
  //  • Same-season upcoming episodes → "watching" (season isn't done yet)
  //  • New season coming soon        → "plan_to_watch" (user can drop if uninterested)

  const autoMoveToWatching: string[] = [];
  const autoMoveToPlanToWatch: string[] = [];

  for (const show of enriched) {
    if (show.status !== "completed") continue;

    if (show.hasUpcomingEpisodesInCurrentSeason) {
      show.status = "watching";
      autoMoveToWatching.push(show.id);
    } else if (show.newSeasonComingSoon) {
      show.status = "plan_to_watch";
      autoMoveToPlanToWatch.push(show.id);
    }
  }

  // Fire-and-forget DB updates — page renders immediately with corrected statuses
  if (autoMoveToWatching.length > 0 && user) {
    supabase
      .from("user_shows")
      .update({ status: "watching" })
      .in("id", autoMoveToWatching)
      .then(({ error }) => {
        if (error) console.error("Auto-move completed→watching failed:", error);
      });
  }
  if (autoMoveToPlanToWatch.length > 0 && user) {
    supabase
      .from("user_shows")
      .update({ status: "plan_to_watch" })
      .in("id", autoMoveToPlanToWatch)
      .then(({ error }) => {
        if (error) console.error("Auto-move completed→plan_to_watch failed:", error);
      });
  }

  // ── Sort: watching first, then completed+new-season, then others ──────────

  enriched.sort((a, b) => {
    const pa = getSortPriority(a);
    const pb = getSortPriority(b);
    if (pa !== pb) return pa - pb;
    // Within the same tier, keep created_at DESC order
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return <MyShowsView initialShows={enriched} isLoggedIn={!!user} />;
}
