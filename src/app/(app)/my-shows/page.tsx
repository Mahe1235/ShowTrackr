import { createClient } from "@/lib/supabase/server";
import { enrichUserShows } from "@/lib/enrich-shows";
import type { UserShow } from "@/types";
import MyShowsView from "./MyShowsView";

export default async function MyShowsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let shows: UserShow[] = [];

  if (user) {
    const { data } = await supabase
      .from("user_shows")
      .select("*")
      .order("created_at", { ascending: false });

    shows = (data as UserShow[]) ?? [];
  }

  const enriched = await enrichUserShows(shows, supabase);

  return <MyShowsView initialShows={enriched} isLoggedIn={!!user} />;
}
