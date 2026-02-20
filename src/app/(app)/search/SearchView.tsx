"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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

const PLATFORMS = [
  "Netflix",
  "Prime Video",
  "Disney+ Hotstar",
  "JioCinema",
  "SonyLIV",
  "ZEE5",
  "Apple TV+",
] as const;

const gridContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

type SearchStatus   = "idle" | "loading" | "success" | "error" | "empty";
type SortOption     = "popularity" | "rating" | "year_desc" | "year_asc" | "name";
type StatusFilter   = "all" | "running" | "ended";
type RatingFilter   = "any" | "7" | "8";
type LanguageFilter = "all" | "en" | "hi" | "ta" | "te" | "ml" | "kn" | "ko" | "ja" | "fr" | "es" | "de" | "zh" | "pt";
type PlatformFilter = "all" | typeof PLATFORMS[number];
type ActiveSheet    = "sort" | "status" | "rating" | "platform" | "language" | null;

interface SearchViewProps {
  popularShows: TVMazeShow[];
}

// ── Fallback types ──────────────────────────────────────────────────────────

interface FallbackInfo {
  shows: TVMazeShow[];
  totalPages: number;
  relaxedFilter: string;
  relaxedFilterLabel: string;
}

// ── FilterChip ────────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5
        rounded-full border text-xs font-medium
        transition-colors duration-150 whitespace-nowrap
        ${active
          ? "bg-accent/15 border-accent/40 text-accent"
          : "bg-bg-surface border-white/10 text-text-secondary hover:border-accent/40 hover:text-text-primary"
        }
      `}
    >
      {label}
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform duration-150 ${active ? "text-accent" : "text-text-muted"}`}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}

export default function SearchView({ popularShows }: SearchViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── URL search params are the SINGLE SOURCE OF TRUTH for filters ──────────
  const activeGenre    = searchParams.get("genre") ?? null;
  const sortOption     = (searchParams.get("sort") as SortOption) || "popularity";
  const statusFilter   = (searchParams.get("status") as StatusFilter) || "all";
  const ratingFilter   = (searchParams.get("rating") as RatingFilter) || "any";
  const langFilter     = (searchParams.get("lang") as LanguageFilter) || "all";

  // Curated language list (ISO 639-1 code → display name)
  const LANGUAGES: Array<{ code: LanguageFilter; label: string }> = [
    { code: "all", label: "All Languages" },
    { code: "en",  label: "English"       },
    { code: "hi",  label: "Hindi"         },
    { code: "ta",  label: "Tamil"         },
    { code: "te",  label: "Telugu"        },
    { code: "ml",  label: "Malayalam"     },
    { code: "kn",  label: "Kannada"       },
    { code: "ko",  label: "Korean"        },
    { code: "ja",  label: "Japanese"      },
    { code: "fr",  label: "French"        },
    { code: "es",  label: "Spanish"       },
    { code: "de",  label: "German"        },
    { code: "zh",  label: "Chinese"       },
    { code: "pt",  label: "Portuguese"    },
  ];
  const platformFilter = (searchParams.get("platform") as PlatformFilter) || "all";

  const activeFilterCount =
    (sortOption      !== "popularity" ? 1 : 0) +
    (statusFilter    !== "all"        ? 1 : 0) +
    (ratingFilter    !== "any"        ? 1 : 0) +
    (langFilter      !== "all"        ? 1 : 0) +
    (platformFilter  !== "all"        ? 1 : 0);

  // Are any filters/genre active? If so, we use server-side discover.
  const useServerDiscover = !!(activeGenre || activeFilterCount > 0);

  // ── Local state ────────────────────────────────────────────────────────────
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);

  // ── Helper: update one or more URL params (shallow replace, no scroll) ────
  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  // ── Local state (not persisted in URL) ────────────────────────────────────
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TVMazeShow[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Discover state (server-paginated) — used for genre AND filtered popular
  const [discoverShows, setDiscoverShows] = useState<TVMazeShow[]>([]);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverTotalPages, setDiscoverTotalPages] = useState(0);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  // Fallback state — set when server-side discover returns 0 results
  const [serverFallback, setServerFallback] = useState<FallbackInfo | null>(null);

  // Popular shows infinite scroll (client-side virtual pagination, no filters)
  const [visibleCount, setVisibleCount] = useState(20);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const isTyping = query.trim().length > 0;

  // ── Determine which shows to display ──────────────────────────────────────
  const displayShows = isTyping
    ? searchResults
    : useServerDiscover
      ? discoverShows
      : popularShows;

  const isFilteredEmpty =
    (status === "idle" || status === "success") &&
    !discoverLoading &&
    displayShows.length === 0 &&
    useServerDiscover &&
    !isTyping;

  // ── Build discover URL with filters ────────────────────────────────────────
  const buildDiscoverUrl = useCallback(
    (page: number): string => {
      const params = new URLSearchParams({
        page: String(page),
      });
      if (activeGenre) params.set("genre", activeGenre);
      if (sortOption !== "popularity") params.set("sort", sortOption);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (ratingFilter !== "any") params.set("rating", ratingFilter);
      if (langFilter !== "all") params.set("language", langFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      return `/api/discover?${params.toString()}`;
    },
    [activeGenre, sortOption, statusFilter, ratingFilter, langFilter, platformFilter]
  );

  // ── Fetch discover results from /api/discover ─────────────────────────────
  const fetchDiscover = useCallback(async (url: string, append: boolean) => {
    setDiscoverLoading(true);
    if (!append) setServerFallback(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Discover failed");
      const data: {
        shows: TVMazeShow[];
        totalPages: number;
        fallback?: FallbackInfo;
      } = await res.json();

      if (append) {
        setDiscoverShows((prev) => [...prev, ...data.shows]);
      } else {
        setDiscoverShows(data.shows);
      }
      setDiscoverTotalPages(data.totalPages);

      // If primary query returned empty but API provided fallback results
      if (data.shows.length === 0 && data.fallback) {
        setServerFallback(data.fallback);
      }

      // Extract page from URL
      const p = new URL(url, window.location.origin).searchParams.get("page");
      setDiscoverPage(parseInt(p ?? "1", 10));
    } catch {
      if (!append) setDiscoverShows([]);
    } finally {
      setDiscoverLoading(false);
    }
  }, []);

  // When genre or any filter changes, fetch page 1 from discover
  useEffect(() => {
    if (useServerDiscover && !isTyping) {
      setDiscoverShows([]);
      setDiscoverPage(1);
      setDiscoverTotalPages(0);
      setStatus("idle");
      fetchDiscover(buildDiscoverUrl(1), false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGenre, isTyping, sortOption, statusFilter, ratingFilter, langFilter, platformFilter]);

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

        if (useServerDiscover && !isTyping) {
          // Server-side pagination: load next page from discover
          if (!discoverLoading && discoverPage < discoverTotalPages) {
            fetchDiscover(buildDiscoverUrl(discoverPage + 1), true);
          }
        } else {
          // Client-side virtual pagination for default popular / search results
          setVisibleCount((prev) => prev + 20);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useServerDiscover, isTyping, discoverLoading, discoverPage, discoverTotalPages, buildDiscoverUrl]);

  // Close sheet on backdrop scroll (UX: dismiss when user scrolls away)
  useEffect(() => {
    if (activeSheet) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [activeSheet]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleGenreClick(genre: string) {
    if (activeGenre === genre) {
      setParams({ genre: null });
    } else {
      setParams({ genre });
      setQuery("");
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    if (activeGenre !== null) {
      setParams({ genre: null });
    }
  }

  function handleResetFilters() {
    setParams({
      sort: null,
      status: null,
      rating: null,
      lang: null,
      platform: null,
    });
  }

  // ── Computed display values ────────────────────────────────────────────────

  // For server-paginated paths: show all loaded. For default popular / search: slice.
  const showsToRender = (useServerDiscover && !isTyping)
    ? displayShows
    : displayShows.slice(0, visibleCount);

  // Show sentinel when there's more to load
  const hasMore = (useServerDiscover && !isTyping)
    ? discoverPage < discoverTotalPages
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

  // Initial discover load shows skeletons
  const showDiscoverSkeletons = useServerDiscover && !isTyping && discoverLoading && discoverShows.length === 0;

  // ── Chip labels (show selected value when active) ─────────────────────────
  const sortLabel     = sortOption     !== "popularity" ? { popularity: "Popular", rating: "Rating", year_desc: "Newest", year_asc: "Oldest", name: "A→Z" }[sortOption] ?? "Sort"   : "Sort";
  const statusLabel   = statusFilter   !== "all"        ? statusFilter === "running" ? "Running" : "Ended"   : "Status";
  const ratingLabel   = ratingFilter   !== "any"        ? `${ratingFilter}.0+`                               : "Rating";
  const platformLabel = platformFilter !== "all"        ? platformFilter                                      : "Platform";
  const langLabel     = langFilter     !== "all"        ? (LANGUAGES.find((l) => l.code === langFilter)?.label ?? "Language") : "Language";

  return (
    <div className="flex flex-col gap-5 pt-12 pb-6">
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

      {/* ── Filter chips row ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-0.5">
        <FilterChip
          label={sortLabel}
          active={sortOption !== "popularity"}
          onClick={() => setActiveSheet(activeSheet === "sort" ? null : "sort")}
        />
        <FilterChip
          label={statusLabel}
          active={statusFilter !== "all"}
          onClick={() => setActiveSheet(activeSheet === "status" ? null : "status")}
        />
        <FilterChip
          label={ratingLabel}
          active={ratingFilter !== "any"}
          onClick={() => setActiveSheet(activeSheet === "rating" ? null : "rating")}
        />
        <FilterChip
          label={platformLabel}
          active={platformFilter !== "all"}
          onClick={() => setActiveSheet(activeSheet === "platform" ? null : "platform")}
        />
        <FilterChip
          label={langLabel}
          active={langFilter !== "all"}
          onClick={() => setActiveSheet(activeSheet === "language" ? null : "language")}
        />
        {activeFilterCount > 0 && (
          <button
            onClick={handleResetFilters}
            className="flex-shrink-0 text-xs text-text-muted hover:text-red-400 transition-colors ml-1"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Results area */}
      <div>
        {/* Section label */}
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
          {sectionLabel}
        </p>

        {/* Loading skeletons — search or initial discover load */}
        {(status === "loading" || showDiscoverSkeletons) && (
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
        {(status === "idle" || status === "success") && !showDiscoverSkeletons && (
          <>
            {isFilteredEmpty ? (
              serverFallback ? (
                /* ── Fallback: filters too restrictive, show relaxed results ── */
                <>
                  <div className="rounded-xl bg-bg-surface border border-accent/20 p-4 mb-4">
                    <div className="flex items-start gap-3">
                      {/* Info icon */}
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-accent flex-shrink-0 mt-0.5"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <div className="flex flex-col gap-2">
                        <p className="text-text-primary text-sm font-medium">
                          No shows match all your filters
                        </p>
                        <p className="text-text-secondary text-xs leading-relaxed">
                          Showing results without the{" "}
                          <span className="text-accent font-medium">
                            {serverFallback.relaxedFilterLabel}
                          </span>{" "}
                          filter.
                        </p>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() =>
                              setParams({ [serverFallback.relaxedFilter]: null })
                            }
                            className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-xs font-medium transition-colors hover:bg-accent/20"
                          >
                            Remove {serverFallback.relaxedFilterLabel}
                          </button>
                          <button
                            onClick={handleResetFilters}
                            className="px-3 py-1.5 rounded-lg bg-bg-raised border border-white/10 text-text-secondary text-xs font-medium transition-colors hover:text-text-primary"
                          >
                            Clear all filters
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key="fallback"
                      variants={gridContainerVariants}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-2 gap-3"
                    >
                      {serverFallback.shows.slice(0, 20).map((show, index) => (
                        <ShowCard key={show.id} show={show} priority={index < 4} />
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </>
              ) : (
                /* ── True empty: even relaxed filters yield nothing ── */
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
              )
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

            {/* Sentinel — loads more on scroll */}
            {hasMore && (
              <div ref={sentinelRef} className="h-8 mt-2 flex items-center justify-center">
                {discoverLoading && (
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Filter bottom sheets ─────────────────────────────────────────── */}
      <AnimatePresence>
        {activeSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              key="filter-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
              onClick={() => setActiveSheet(null)}
            />

            {/* Sheet */}
            <motion.div
              key="filter-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="
                fixed bottom-0 left-0 right-0 z-[60]
                bg-bg-surface border-t border-white/10
                rounded-t-2xl px-4 pt-3 pb-10
              "
            >
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full bg-bg-raised mx-auto mb-5" />

              {/* Sort sheet */}
              {activeSheet === "sort" && (
                <>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Sort by</p>
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        { value: "popularity", label: "Popular"  },
                        { value: "rating",     label: "Top Rated" },
                        { value: "year_desc",  label: "Newest"   },
                        { value: "year_asc",   label: "Oldest"   },
                        { value: "name",       label: "A → Z"    },
                      ] as { value: SortOption; label: string }[]
                    ).map(({ value, label }) => {
                      const isSelected = sortOption === value;
                      return (
                        <button
                          key={value}
                          onClick={() => {
                            setParams({ sort: value === "popularity" ? null : value });
                            setActiveSheet(null);
                          }}
                          className={`
                            flex items-center justify-between px-4 py-3.5 rounded-xl
                            border transition-colors duration-150 text-left w-full
                            ${isSelected
                              ? "bg-accent/15 border-accent/40 text-accent"
                              : "bg-bg-raised border-white/5 text-text-secondary hover:border-white/15 hover:text-text-primary"
                            }
                          `}
                        >
                          <span className="text-sm font-medium">{label}</span>
                          {isSelected && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Status sheet */}
              {activeSheet === "status" && (
                <>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Status</p>
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        { value: "all",     label: "All"     },
                        { value: "running", label: "Running" },
                        { value: "ended",   label: "Ended"   },
                      ] as { value: StatusFilter; label: string }[]
                    ).map(({ value, label }) => {
                      const isSelected = statusFilter === value;
                      return (
                        <button
                          key={value}
                          onClick={() => {
                            setParams({ status: value === "all" ? null : value });
                            setActiveSheet(null);
                          }}
                          className={`
                            flex items-center justify-between px-4 py-3.5 rounded-xl
                            border transition-colors duration-150 text-left w-full
                            ${isSelected
                              ? "bg-accent/15 border-accent/40 text-accent"
                              : "bg-bg-raised border-white/5 text-text-secondary hover:border-white/15 hover:text-text-primary"
                            }
                          `}
                        >
                          <span className="text-sm font-medium">{label}</span>
                          {isSelected && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Rating sheet */}
              {activeSheet === "rating" && (
                <>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Min Rating</p>
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        { value: "any", label: "Any Rating" },
                        { value: "7",   label: "7.0 and above" },
                        { value: "8",   label: "8.0 and above" },
                      ] as { value: RatingFilter; label: string }[]
                    ).map(({ value, label }) => {
                      const isSelected = ratingFilter === value;
                      return (
                        <button
                          key={value}
                          onClick={() => {
                            setParams({ rating: value === "any" ? null : value });
                            setActiveSheet(null);
                          }}
                          className={`
                            flex items-center justify-between px-4 py-3.5 rounded-xl
                            border transition-colors duration-150 text-left w-full
                            ${isSelected
                              ? "bg-accent/15 border-accent/40 text-accent"
                              : "bg-bg-raised border-white/5 text-text-secondary hover:border-white/15 hover:text-text-primary"
                            }
                          `}
                        >
                          <span className="text-sm font-medium">{label}</span>
                          {isSelected && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Platform sheet */}
              {activeSheet === "platform" && (
                <>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Platform</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setParams({ platform: null });
                        setActiveSheet(null);
                      }}
                      className={`
                        flex items-center justify-between px-4 py-3.5 rounded-xl
                        border transition-colors duration-150 text-left w-full
                        ${platformFilter === "all"
                          ? "bg-accent/15 border-accent/40 text-accent"
                          : "bg-bg-raised border-white/5 text-text-secondary hover:border-white/15 hover:text-text-primary"
                        }
                      `}
                    >
                      <span className="text-sm font-medium">All Platforms</span>
                      {platformFilter === "all" && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    {PLATFORMS.map((platform) => {
                      const isSelected = platformFilter === platform;
                      return (
                        <button
                          key={platform}
                          onClick={() => {
                            setParams({ platform });
                            setActiveSheet(null);
                          }}
                          className={`
                            flex items-center justify-between px-4 py-3.5 rounded-xl
                            border transition-colors duration-150 text-left w-full
                            ${isSelected
                              ? "bg-accent/15 border-accent/40 text-accent"
                              : "bg-bg-raised border-white/5 text-text-secondary hover:border-white/15 hover:text-text-primary"
                            }
                          `}
                        >
                          <span className="text-sm font-medium">{platform}</span>
                          {isSelected && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Language sheet */}
              {activeSheet === "language" && (
                <>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Language</p>
                  <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                    {LANGUAGES.map(({ code, label }) => {
                      const isSelected = langFilter === code;
                      return (
                        <button
                          key={code}
                          onClick={() => {
                            setParams({ lang: code === "all" ? null : code });
                            setActiveSheet(null);
                          }}
                          className={`
                            flex items-center justify-between px-4 py-3.5 rounded-xl
                            border transition-colors duration-150 text-left w-full flex-shrink-0
                            ${isSelected
                              ? "bg-accent/15 border-accent/40 text-accent"
                              : "bg-bg-raised border-white/5 text-text-secondary hover:border-white/15 hover:text-text-primary"
                            }
                          `}
                        >
                          <span className="text-sm font-medium">{label}</span>
                          {isSelected && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
