import PageWrapper from "@/components/layout/PageWrapper";
import SearchView from "./SearchView";
import { getPopularShows } from "@/lib/tvmaze";
import type { TVMazeShow } from "@/types";

export default async function SearchPage() {
  let popularShows: TVMazeShow[] = [];
  try {
    const all = await getPopularShows();
    popularShows = all.slice(0, 20);
  } catch {
    popularShows = [];
  }

  return (
    <PageWrapper>
      <SearchView popularShows={popularShows} />
    </PageWrapper>
  );
}
