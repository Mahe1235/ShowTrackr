import { Suspense } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import SearchView from "./SearchView";
import { getPopularShows } from "@/lib/tvmaze";
import type { TVMazeShow } from "@/types";

export default async function SearchPage() {
  let popularShows: TVMazeShow[] = [];
  try {
    // Pass all ~250 shows — SearchView handles virtual pagination via IntersectionObserver
    popularShows = await getPopularShows();
  } catch {
    popularShows = [];
  }

  return (
    <PageWrapper>
      {/* Suspense required because SearchView uses useSearchParams() */}
      <Suspense fallback={null}>
        <SearchView popularShows={popularShows} />
      </Suspense>
    </PageWrapper>
  );
}
