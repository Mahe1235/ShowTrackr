import { NextResponse } from "next/server";
import { discoverShows, GENRE_MAP } from "@/lib/tmdb";

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

  const voteCount = searchParams.get("vote_count");

  const genreId      = GENRE_MAP[genre] ?? undefined;
  const sortBy       = SORT_MAP[sort] ?? "popularity.desc";
  const ratingMin    = rating ? parseFloat(rating) : undefined;
  const voteCountMin = voteCount ? parseInt(voteCount, 10) : undefined;

  try {
    const result = await discoverShows({
      genreId,
      page,
      sortBy,
      status: status ?? undefined,
      ratingMin,
      language: language ?? undefined,
      voteCountMin,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Discover API error:", err);
    return NextResponse.json({ shows: [], totalPages: 0 }, { status: 500 });
  }
}
