import { createClient } from "@/lib/supabase/server";
import type { UserShow } from "@/types";
import MyShowsView from "./MyShowsView";

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

  return <MyShowsView initialShows={shows} isLoggedIn={!!user} />;
}
