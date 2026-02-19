import { NextResponse } from "next/server";
import { searchShows } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchShows(query);
    return NextResponse.json(results);
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json([], { status: 500 });
  }
}
