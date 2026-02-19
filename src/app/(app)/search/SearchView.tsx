"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ShowCard from "@/components/ui/ShowCard";
import SkeletonCard, { SkeletonText } from "@/components/ui/SkeletonCard";
import type { TVMazeShow } from "@/types";

const GENRES = [
  "Drama",
  "Comedy",
  "Crime",
  "Sci-Fi & Fantasy",
  "Action & Adventure",
  "Mystery",
  "Animation",
  "Documentary",
  "Reality",
  "Kids",
  "News",
  "Talk",
] as const;

const gridContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

type SearchStatus  = "idle" | "loading" | "success" | "error" | "empty";
type SortOption    = "popularity" | "rating" | "year_desc" | "year_asc" | "name";
type StatusFilter  = "all" | "running" | "ended";
type RatingFilter  = "any" | "7" | "8";
type LanguageFilter = "all" | "english";

interface SearchViewProps {
  popularShows: TVMazeShow[];
}

// Pure function — lives outside the component so it's never re-created on render
function applyFiltersAndSort(
  shows: TVMazeShow[],
  sort: SortOption,
  status: StatusFilter,
  rating: RatingFilter,
  lang: LanguageFilter
): TVMazeShow[] {
  let result = shows;

  // 1. Filter by status
  if (status !== "all") {
    result = result.filter((s) =>
      status === "running" ? s.status === "Running" : s.status !== "Running"
    );
  }

  // 2. Filter by minimum rating (nulls always excluded when threshold is set)
  if (rating !== "any") {
    const threshold = rating === "7" ? 7.0 : 8.0;
    result = result.filter(
      (s) => s.rating.average !== null && s.rating.average >= threshold
    );
  }

  // 3. Filter by language
  if (lang === "english") {
    result = result.filter((s) => s.language === "English");
  }

  // 4. Sort — slice() first to avoid mutating the original prop array
  return result.slice().sort((a, b) => {
    switch (sort) {
      case "popularity":
        return b.weight - a.weight;
      case "rating": {
        const ra = a.rating.average ?? -1;
        const rb = b.rating.average ?? -1;
        return rb - ra;
      }
      case "year_desc": {
        const ya = a.premiered ?? "";
        const yb = b.premiered ?? "";
        if (!ya && !yb) return 0;
        if (!ya) return 1;
        if (!yb) return -1;
        return yb.localeCompare(ya);
      }
      case "year_asc": {
        const ya = a.premiered ?? "";
        const yb = b.premiered ?? "";
        if (!ya && !yb) return 0;
        if (!ya) return 1;
        if (!yb) return -1;
        return ya.localeCompare(yb);
      }
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });
}

export default function SearchView({ popularShows }: SearchViewProps) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TVMazeShow[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Genre discover state (server-paginated)
  const [genreShows, setGenreShows] = useState<TVMazeShow[]>([]);
  const [genrePage, setGenrePage] = useState(1);
  const [genreTotalPages, setGenreTotalPages] = useState(0);
  const [genreLoading, setGenreLoading] = useState(false);

  // Popular shows infinite scroll (client-side virtual pagination)
  const [visibleCount, setVisibleCount] = useState(20);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Pre-select genre from URL param (e.g. /search?genre=Drama)
  useEffect(() => {
    const genre = searchParams.get("genre");
    if (genre) {
      setActiveGenre(genre);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter / sort state
  const [sortOption, setSortOption]     = useState<SortOption>("popularity");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("any");
  const [langFilter, setLangFilter]     = useState<LanguageFilter>("all");
  const [filtersOpen, setFiltersOpen]   = useState(false);

  const isTyping = query.trim().length > 0;

  // Determine which shows to display
  const baseShows = isTyping
    ? searchResults
    : activeGenre
      ? genreShows
      : popularShows;

  const displayShows = applyFiltersAndSort(
    baseShows,
    sortOption,
    statusFilter,
    ratingFilter,
    langFilter
  );

  const activeFilterCount =
    (sortOption    !== "popularity" ? 1 : 0) +
    (statusFilter  !== "all"        ? 1 : 0) +
    (ratingFilter  !== "any"        ? 1 : 0) +
    (langFilter    !== "all"        ? 1 : 0);

  const isFilteredEmpty =
    (status === "idle" || status === "success") &&
    displayShows.length === 0 &&
    baseShows.length > 0;

  // ── Fetch genre discover results from /api/discover ────────────────────────
  const fetchGenre = useCallback(async (genre: string, page: number, append: boolean) => {
    setGenreLoading(true);
    try {
      const res = await fetch(
        `/api/discover?genre=${encodeURIComponent(genre)}&page=${page}`
      );
      if (!res.ok) throw new Error("Discover failed");
      const data: { shows: TVMazeShow[]; totalPages: number } = await res.json();

      if (append) {
        setGenreShows((prev) => [...prev, ...data.shows]);
      } else {
        setGenreShows(data.shows);
      }
      setGenreTotalPages(data.totalPages);
      setGenrePage(page);
    } catch {
      if (!append) setGenreShows([]);
    } finally {
      setGenreLoading(false);
    }
  }, []);

  // When genre changes, fetch page 1
  useEffect(() => {
    if (activeGenre && !isTyping) {
      setGenreShows([]);
      setGenrePage(1);
      setGenreTotalPages(0);
      setStatus("idle");
      fetchGenre(activeGenre, 1, false);
    }
  }, [activeGenre, isTyping, fetchGenre]);

  // ── Typed search query → /api/search ───────────────────────────────────────
  useEffect(() => {
    const trimmed = query.trim();
    setVisibleCount(20);

    if (trimmed.length === 0) {
      setStatus("idle");
      setSearchResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus("loading");

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error("Search failed");
        const data: Array<{ show: TVMazeShow }> = await res.json();
        const shows = data.map((r) => r.show);
        if (shows.length === 0) {
          setStatus("empty");
          setSearchResults([]);
        } else {
          setSearchResults(shows);
          setStatus("success");
        }
      } catch {
        setStatus("error");
        setSearchResults([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ── Infinite scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;

        if (activeGenre && !isTyping) {
          // Server-side pagination: load next page from TMDB discover
          if (!genreLoading && genrePage < genreTotalPages) {
            fetchGenre(activeGenre, genrePage + 1, true);
          }
        } else {
          // Client-side virtual pagination for popular/search results
          setVisibleCount((prev) => prev + 20);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeGenre, isTyping, genreLoading, genrePage, genreTotalPages, fetchGenre]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleGenreClick(genre: string) {
    if (activeGenre === genre) {
      setActiveGenre(null);
    } else {
      setActiveGenre(genre);
      setQuery("");
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    if (activeGenre !== null) {
      setActiveGenre(null);
    }
  }

  function handleResetFilters() {
    setSortOption("popularity");
    setStatusFilter("all");
    setRatingFilter("any");
    setLangFilter("all");
  }

  // ── Computed display values ────────────────────────────────────────────────

  // For popular shows & search: slice by visibleCount. For genre: show all loaded.
  const showsToRender = (activeGenre && !isTyping)
    ? displayShows
    : displayShows.slice(0, visibleCount);

  // Show sentinel when there's more to load
  const hasMore = (activeGenre && !isTyping)
    ? genrePage < genreTotalPages
    : visibleCount < displayShows.length;

  // Determine section label
  const sectionLabel = (() => {
    if (status === "loading") return "Searching...";
    if (status === "empty") return "No Results";
    if (status === "error") return "Something went wrong";
    if (isTyping && status === "success") return `Results for "${query}"`;
    if (activeGenre) return `${activeGenre} Shows`;
    return "Popular Shows";
  })();

  // Initial genre load shows skeletons
  const showGenreSkeletons = activeGenre && !isTyping && genreLoading && genreShows.length === 0;

  return (
    <div className="flex flex-col gap-6 pt-12 pb-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold">Discover</h1>
        <p className="mt-1 text-text-secondary text-sm font-light">
          Find your next show to watch.
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-muted"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          type="search"
          value={query}
          onChange={handleInputChange}
          placeholder="Search shows..."
          className="
            w-full bg-bg-surface border border-white/5 rounded-xl
            pl-10 pr-4 py-3
            text-text-primary placeholder:text-text-muted
            text-sm
            focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/40
            transition-colors duration-200
          "
        />
      </div>

      {/* Genre chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
        {GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => handleGenreClick(genre)}
            className={`
              flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium
              border transition-colors duration-150
              ${
                activeGenre === genre
                  ? "bg-accent border-accent text-white"
                  : "bg-bg-surface border-white/10 text-text-secondary hover:border-accent/40 hover:text-text-primary"
              }
            `}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* ── Filter / Sort ── */}
      <div className="flex flex-col gap-0">
        {/* Toggle row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFiltersOpen((prev) => !prev)}
            className={`
              flex items-center gap-2 px-3.5 py-1.5
              border rounded-xl text-xs font-medium
              transition-colors duration-150
              ${filtersOpen || activeFilterCount > 0
                ? "bg-accent/10 border-accent/40 text-accent"
                : "bg-bg-surface border-white/10 text-text-secondary hover:border-accent/40 hover:text-text-primary"
              }
            `}
          >
            {/* Sliders icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4"  y1="6"  x2="20" y2="6" />
              <line x1="4"  y1="12" x2="20" y2="12" />
              <line x1="4"  y1="18" x2="20" y2="18" />
              <circle cx="8"  cy="6"  r="2.5" fill="currentColor" stroke="none" />
              <circle cx="16" cy="12" r="2.5" fill="currentColor" stroke="none" />
              <circle cx="10" cy="18" r="2.5" fill="currentColor" stroke="none" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent text-white text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Collapsible panel */}
        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              key="filter-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-4 pt-4 pb-1">

                {/* Sort */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                    Sort by
                  </span>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
                    {(
                      [
                        { value: "popularity", label: "Popular"  },
                        { value: "rating",     label: "Rating"   },
                        { value: "year_desc",  label: "Newest"   },
                        { value: "year_asc",   label: "Oldest"   },
                        { value: "name",       label: "A → Z"    },
                      ] as { value: SortOption; label: string }[]
                    ).map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setSortOption(value)}
                        className={`
                          flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium
                          border transition-colors duration-150
                          ${sortOption === value
                            ? "bg-accent border-accent text-white"
                            : "bg-bg-raised border-white/10 text-text-secondary hover:border-accent/40 hover:text-text-primary"
                          }
                        `}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                    Status
                  </span>
                  <div className="flex gap-2">
                    {(["all", "running", "ended"] as StatusFilter[]).map((v) => (
                      <button
                        key={v}
                        onClick={() => setStatusFilter(v)}
                        className={`
                          px-3 py-1.5 rounded-xl text-xs font-medium capitalize
                          border transition-colors duration-150
                          ${statusFilter === v
                            ? "bg-accent border-accent text-white"
                            : "bg-bg-raised border-white/10 text-text-secondary hover:border-accent/40 hover:text-text-primary"
                          }
                        `}
                      >
                        {v === "all" ? "All" : v === "running" ? "Running" : "Ended"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min Rating */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                    Min Rating
                  </span>
                  <div className="flex gap-2">
                    {(
                      [
                        { value: "any", label: "Any"  },
                        { value: "7",   label: "7.0+" },
                        { value: "8",   label: "8.0+" },
                      ] as { value: RatingFilter; label: string }[]
                    ).map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setRatingFilter(value)}
                        className={`
                          px-3 py-1.5 rounded-xl text-xs font-medium
                          border transition-colors duration-150
                          ${ratingFilter === value
                            ? "bg-accent border-accent text-white"
                            : "bg-bg-raised border-white/10 text-text-secondary hover:border-accent/40 hover:text-text-primary"
                          }
                        `}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                    Language
                  </span>
                  <div className="flex gap-2">
                    {(
                      [
                        { value: "all",     label: "All"     },
                        { value: "english", label: "English" },
                      ] as { value: LanguageFilter; label: string }[]
                    ).map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setLangFilter(value)}
                        className={`
                          px-3 py-1.5 rounded-xl text-xs font-medium
                          border transition-colors duration-150
                          ${langFilter === value
                            ? "bg-accent border-accent text-white"
                            : "bg-bg-raised border-white/10 text-text-secondary hover:border-accent/40 hover:text-text-primary"
                          }
                        `}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results area */}
      <div>
        {/* Section label */}
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
          {sectionLabel}
        </p>

        {/* Loading skeletons — search or initial genre load */}
        {(status === "loading" || showGenreSkeletons) && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <SkeletonCard />
                <SkeletonText className="w-3/4" />
                <SkeletonText className="w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* API empty state */}
        {status === "empty" && (
          <div className="py-16 flex flex-col items-center gap-2 text-center">
            <p className="text-text-primary font-medium">No shows found</p>
            <p className="text-text-muted text-sm">Try a different title or genre</p>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="py-16 flex flex-col items-center gap-2 text-center">
            <p className="text-text-primary font-medium">Could not load results</p>
            <p className="text-text-muted text-sm">Check your connection</p>
          </div>
        )}

        {/* Show grid */}
        {(status === "idle" || status === "success") && !showGenreSkeletons && (
          <>
            {isFilteredEmpty ? (
              <div className="py-16 flex flex-col items-center gap-2 text-center">
                <p className="text-text-primary font-medium">No shows match your filters</p>
                <p className="text-text-muted text-sm">
                  Try adjusting or{" "}
                  <button
                    onClick={handleResetFilters}
                    className="text-accent underline underline-offset-2"
                  >
                    clearing filters
                  </button>
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeGenre ?? (isTyping ? "search" : "popular")}
                  variants={gridContainerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 gap-3"
                >
                  {showsToRender.map((show, index) => (
                    <ShowCard key={show.id} show={show} priority={index < 4} />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Sentinel — loads more on scroll (server pages for genre, client virtual for others) */}
            {hasMore && (
              <div ref={sentinelRef} className="h-8 mt-2 flex items-center justify-center">
                {genreLoading && (
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
