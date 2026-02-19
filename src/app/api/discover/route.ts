import { NextResponse } from "next/server";
import { discoverShows, discoverShowsByRating, GENRE_MAP } from "@/lib/tmdb";
import type { TVMazeShow } from "@/types";

// Map client sort options to TMDB sort_by values
const SORT_MAP: Record<string, string> = {
  popularity: "popularity.desc",
  rating:     "vote_average.desc",
  year_desc:  "first_air_date.desc",
  year_asc:   "first_air_date.asc",
  name:       "name.asc",
};

// ── Fallback: relax filters one-by-one when primary query returns 0 results ──

interface FallbackResult {
  shows: TVMazeShow[];
  totalPages: number;
  relaxedFilter: string;
  relaxedFilterLabel: string;
}

const FILTER_LABELS: Record<string, Record<string, string>> = {
  rating:   { "8": "8+ rating", "7": "7+ rating" },
  status:   { running: "Running status", ended: "Ended status" },
  language: { en: "English only" },
};

async function tryFallback(opts: {
  genreId?: number;
  sort: string;
  status: "running" | "ended" | undefined;
  ratingMin: number | undefined;
  language: string | undefined;
}): Promise<FallbackResult | null> {
  // Build relaxation candidates in priority order (most restrictive first)
  const candidates: Array<{
    filter: string;
    label: string;
    overrides: Partial<typeof opts>;
  }> = [];

  if (opts.ratingMin) {
    candidates.push({
      filter: "rating",
      label: FILTER_LABELS.rating[String(opts.ratingMin)] ?? `${opts.ratingMin}+ rating`,
      overrides: { ratingMin: undefined },
    });
  }
  if (opts.status) {
    candidates.push({
      filter: "status",
      label: FILTER_LABELS.status[opts.status] ?? `${opts.status} status`,
      overrides: { status: undefined },
    });
  }
  if (opts.language) {
    candidates.push({
      filter: "language",
      label: FILTER_LABELS.language[opts.language] ?? "Language filter",
      overrides: { language: undefined },
    });
  }

  for (const candidate of candidates) {
    const relaxed = { ...opts, ...candidate.overrides };

    let result: { shows: TVMazeShow[]; totalPages: number };

    if (relaxed.sort === "rating") {
      result = await discoverShowsByRating({
        genreId: relaxed.genreId,
        page: 1,
        status: relaxed.status,
        ratingMin: relaxed.ratingMin,
        language: relaxed.language,
      });
    } else {
      const sortBy = SORT_MAP[relaxed.sort] ?? "popularity.desc";
      result = await discoverShows({
        genreId: relaxed.genreId,
        page: 1,
        sortBy,
        status: relaxed.status,
        ratingMin: relaxed.ratingMin,
        language: relaxed.language,
      });
    }

    if (result.shows.length > 0) {
      return {
        shows: result.shows,
        totalPages: result.totalPages,
        relaxedFilter: candidate.filter,
        relaxedFilterLabel: candidate.label,
      };
    }
  }

  return null; // All relaxations also yielded 0 results
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre    = searchParams.get("genre") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const sort     = searchParams.get("sort") ?? "popularity";
  const status   = (searchParams.get("status") as "running" | "ended" | null) ?? undefined;
  const rating   = searchParams.get("rating");
  const language = searchParams.get("language") ?? undefined;

  const genreId   = GENRE_MAP[genre] ?? undefined;
  const ratingMin = rating ? parseFloat(rating) : undefined;

  const hasActiveFilters = !!(ratingMin || status || language);

  try {
    // When sorting by rating, use the hybrid approach:
    // fetch popular shows from TMDB, then re-sort by rating server-side.
    let result: { shows: TVMazeShow[]; totalPages: number };

    if (sort === "rating") {
      result = await discoverShowsByRating({
        genreId,
        page,
        status: status ?? undefined,
        ratingMin,
        language: language ?? undefined,
      });
    } else {
      const sortBy = SORT_MAP[sort] ?? "popularity.desc";
      result = await discoverShows({
        genreId,
        page,
        sortBy,
        status: status ?? undefined,
        ratingMin,
        language: language ?? undefined,
      });
    }

    // If primary query returned empty and we have active filters, try fallback
    if (result.shows.length === 0 && hasActiveFilters && page === 1) {
      const fallback = await tryFallback({
        genreId,
        sort,
        status: status ?? undefined,
        ratingMin,
        language: language ?? undefined,
      });

      if (fallback) {
        return NextResponse.json({
          shows: [],
          totalPages: 0,
          fallback,
        });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Discover API error:", err);
    return NextResponse.json({ shows: [], totalPages: 0 }, { status: 500 });
  }
}
