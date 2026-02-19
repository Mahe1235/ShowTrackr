import { NextResponse } from "next/server";
import { discoverShows, discoverShowsByRating, GENRE_MAP } from "@/lib/tmdb";

// Map client sort options to TMDB sort_by values
const SORT_MAP: Record<string, string> = {
  popularity: "popularity.desc",
  rating:     "vote_average.desc",
  year_desc:  "first_air_date.desc",
  year_asc:   "first_air_date.asc",
  name:       "name.asc",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre    = searchParams.get("genre") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const sort     = searchParams.get("sort") ?? "popularity";
  const status   = searchParams.get("status") as "running" | "ended" | null;
  const rating   = searchParams.get("rating");
  const language = searchParams.get("language");

  const genreId   = GENRE_MAP[genre] ?? undefined;
  const ratingMin = rating ? parseFloat(rating) : undefined;

  try {
    // When sorting by rating, use the hybrid approach:
    // fetch popular shows from TMDB, then re-sort by rating server-side.
    // This ensures only well-known shows appear in the "top rated" list.
    if (sort === "rating") {
      const result = await discoverShowsByRating({
        genreId,
        page,
        status: status ?? undefined,
        ratingMin,
        language: language ?? undefined,
      });
      return NextResponse.json(result);
    }

    // All other sorts: pass directly to TMDB
    const sortBy = SORT_MAP[sort] ?? "popularity.desc";
    const result = await discoverShows({
      genreId,
      page,
      sortBy,
      status: status ?? undefined,
      ratingMin,
      language: language ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Discover API error:", err);
    return NextResponse.json({ shows: [], totalPages: 0 }, { status: 500 });
  }
}
