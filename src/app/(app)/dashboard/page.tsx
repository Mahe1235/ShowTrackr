import { createClient } from "@/lib/supabase/server";
import { getPopularShows, getTopRatedShows } from "@/lib/tmdb";
import { enrichUserShows } from "@/lib/enrich-shows";
import PageWrapper from "@/components/layout/PageWrapper";
import HomeView from "./HomeView";
import type { TVMazeShow, UserShow } from "@/types";

export default async function DashboardPage() {
  // Fetch popular + top rated shows in parallel (cached 1hr by TMDB layer)
  let popularShows: TVMazeShow[] = [];
  let topRatedShows: TVMazeShow[] = [];
  try {
    const [allPopular, topRated] = await Promise.all([
      getPopularShows(),
      getTopRatedShows(),
    ]);
    // Sort by weight descending, take top 20
    popularShows = allPopular
      .slice()
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 20);
    topRatedShows = topRated;
  } catch {
    popularShows = [];
    topRatedShows = [];
  }

  // Fetch user's shows (if logged in)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userShows: UserShow[] = [];
  if (user) {
    const { data } = await supabase
      .from("user_shows")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    userShows = (data as UserShow[]) ?? [];
  }

  // Enrich with TMDB metadata, auto-move, and sort
  const enrichedShows = await enrichUserShows(userShows, supabase);

  return (
    <PageWrapper>
      <HomeView
        popularShows={popularShows}
        topRatedShows={topRatedShows}
        userShows={enrichedShows}
        isLoggedIn={!!user}
      />
    </PageWrapper>
  );
}
