import { createClient } from "@/lib/supabase/server";
import { getPopularShows } from "@/lib/tvmaze";
import PageWrapper from "@/components/layout/PageWrapper";
import HomeView from "./HomeView";
import type { TVMazeShow } from "@/types";
import type { UserShow } from "@/types";

export default async function DashboardPage() {
  // Fetch popular shows (cached 1hr by TVMaze layer)
  let popularShows: TVMazeShow[] = [];
  try {
    const all = await getPopularShows();
    // Sort by weight descending, take top 20
    popularShows = all
      .slice()
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 20);
  } catch {
    popularShows = [];
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

  return (
    <PageWrapper>
      <HomeView
        popularShows={popularShows}
        userShows={userShows}
        isLoggedIn={!!user}
      />
    </PageWrapper>
  );
}
