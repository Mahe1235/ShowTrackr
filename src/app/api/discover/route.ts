import { NextResponse } from "next/server";
import { discoverShows, GENRE_MAP } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const genreId = GENRE_MAP[genre] ?? undefined;

  try {
    const result = await discoverShows({ genreId, page });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Discover API error:", err);
    return NextResponse.json({ shows: [], totalPages: 0 }, { status: 500 });
  }
}
