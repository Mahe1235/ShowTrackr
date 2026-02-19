"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { TVMazeShow, TVMazeEpisode, ShowStatus } from "@/types";

// ── Pure utility functions ──────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function groupBySeason(episodes: TVMazeEpisode[]): Map<number, TVMazeEpisode[]> {
  const map = new Map<number, TVMazeEpisode[]>();
  for (const ep of episodes) {
    const existing = map.get(ep.season) ?? [];
    existing.push(ep);
    map.set(ep.season, existing);
  }
  return map;
}

function formatEpisodeCode(season: number, number: number | null): string {
  const s = String(season).padStart(2, "0");
  if (number === null) return `S${s} Special`;
  return `S${s}E${String(number).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Tracking constants (outside component — stable across renders) ──────────

const STATUS_DISPLAY: Record<ShowStatus, string> = {
  watching:      "Watching",
  plan_to_watch: "Plan to Watch",
  completed:     "Completed",
  on_hold:       "On Hold",
  dropped:       "Dropped",
};

const STATUS_OPTIONS: Array<{ status: ShowStatus; label: string; icon: React.ReactElement }> = [
  {
    status: "watching",
    label: "Watching",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    status: "plan_to_watch",
    label: "Plan to Watch",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    status: "completed",
    label: "Completed",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    status: "on_hold",
    label: "On Hold",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
        <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    status: "dropped",
    label: "Dropped",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
];

// ── Component ──────────────────────────────────────────────────────────────

interface ShowDetailProps {
  show: TVMazeShow;
  episodes: TVMazeEpisode[];
}

const SUMMARY_CUTOFF = 200;

export default function ShowDetail({ show, episodes }: ShowDetailProps) {
  const router = useRouter();

  // ── Existing state ──
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(
    () => new Set([1])
  );

  // ── Tracking state ──
  // undefined = initial loading, null = not tracked, ShowStatus = tracked
  const [trackingStatus, setTrackingStatus] = useState<ShowStatus | null | undefined>(undefined);
  const [sheetOpen, setSheetOpen]           = useState(false);
  const [isMutating, setIsMutating]         = useState(false);

  // ── Derived values ──
  const imageUrl = show.image?.original ?? show.image?.medium ?? null;
  const networkName = show.network?.name ?? show.webChannel?.name ?? null;
  const plainSummary = show.summary ? stripHtml(show.summary) : null;
  const nextEp = show._embedded?.nextepisode ?? null;
  const seasonMap = groupBySeason(episodes);

  const isTruncatable = plainSummary !== null && plainSummary.length > SUMMARY_CUTOFF;
  const displayedSummary =
    plainSummary === null
      ? null
      : summaryExpanded || !isTruncatable
      ? plainSummary
      : plainSummary.slice(0, SUMMARY_CUTOFF) + "…";

  const isTrackingLoaded = trackingStatus !== undefined;
  const isTracked        = isTrackingLoaded && trackingStatus !== null;

  // ── Check tracking status on mount ──
  useEffect(() => {
    const supabase = createClient();
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTrackingStatus(null);
        return;
      }
      const { data } = await supabase
        .from("user_shows")
        .select("status")
        .eq("tvmaze_show_id", show.id)
        .maybeSingle();
      setTrackingStatus((data?.status as ShowStatus) ?? null);
    }
    check();
  }, [show.id]);

  // ── Body scroll lock when sheet is open ──
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  // ── Season accordion toggle ──
  function toggleSeason(seasonNum: number) {
    setOpenSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonNum)) {
        next.delete(seasonNum);
      } else {
        next.add(seasonNum);
      }
      return next;
    });
  }

  // ── Tracking handlers ──
  const handleStatusSelect = useCallback(async (newStatus: ShowStatus) => {
    const prev = trackingStatus;
    setSheetOpen(false);
    setTrackingStatus(newStatus);
    setIsMutating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("user_shows").upsert(
        {
          user_id:        user.id,
          tvmaze_show_id: show.id,
          show_name:      show.name,
          show_poster:    show.image?.medium   ?? show.image?.original ?? null,
          show_backdrop:  show.image?.original ?? show.image?.medium   ?? null,
          status:         newStatus,
        },
        { onConflict: "user_id,tvmaze_show_id" }
      );
      if (error) throw error;
      router.refresh();
    } catch {
      setTrackingStatus(prev);
    } finally {
      setIsMutating(false);
    }
  }, [trackingStatus, show, router]);

  const handleRemove = useCallback(async () => {
    const prev = trackingStatus;
    setSheetOpen(false);
    setTrackingStatus(null);
    setIsMutating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase
        .from("user_shows")
        .delete()
        .eq("tvmaze_show_id", show.id)
        .eq("user_id", user.id);
      if (error) throw error;
      router.refresh();
    } catch {
      setTrackingStatus(prev);
    } finally {
      setIsMutating(false);
    }
  }, [trackingStatus, show.id, router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="min-h-screen flex flex-col"
    >
      {/* ── A. Hero ──────────────────────────────────────────────────────── */}
      <section className="relative w-full aspect-[2/3] max-h-[460px] bg-bg-raised overflow-hidden flex-shrink-0">

        {/* Poster */}
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={show.name}
            fill
            sizes="100vw"
            className="object-cover object-top"
            priority
          />
        )}

        {/* Gradient fade to page background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="
            absolute top-12 left-4 z-10
            w-9 h-9 rounded-full
            bg-black/40 backdrop-blur-sm
            border border-white/10
            flex items-center justify-center
            active:scale-95 transition-transform duration-100
          "
          aria-label="Go back"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-primary"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Title + network overlaid on gradient */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 z-10">
          <h1 className="text-2xl font-bold text-text-primary leading-tight">
            {show.name}
          </h1>
          {networkName && (
            <p className="text-sm text-text-secondary mt-0.5">{networkName}</p>
          )}
        </div>

        {/* No-image fallback */}
        {!imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <span className="text-text-muted text-lg font-medium text-center">
              {show.name}
            </span>
          </div>
        )}
      </section>

      {/* ── B. Content ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 flex flex-col gap-6 pb-24">

        {/* ── C. Core info row ─────────────────────────────────────────── */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5">
          {show.premiered && (
            <span className="text-sm text-text-secondary">
              {show.premiered.slice(0, 4)}
            </span>
          )}

          {show.premiered && <span className="text-text-muted text-xs">·</span>}

          <span className="flex items-center gap-1.5 text-sm">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                show.status === "Running" ? "bg-green-500" : "bg-text-muted"
              }`}
            />
            <span
              className={
                show.status === "Running"
                  ? "text-green-400"
                  : "text-text-secondary"
              }
            >
              {show.status}
            </span>
          </span>

          {show.rating.average !== null && (
            <>
              <span className="text-text-muted text-xs">·</span>
              <span className="text-sm text-text-secondary flex items-center gap-1">
                <span>⭐</span>
                <span>{show.rating.average.toFixed(1)}</span>
              </span>
            </>
          )}

          {show.runtime !== null && (
            <>
              <span className="text-text-muted text-xs">·</span>
              <span className="text-sm text-text-secondary">
                {show.runtime}m
              </span>
            </>
          )}

          {show.language && (
            <>
              <span className="text-text-muted text-xs">·</span>
              <span className="text-sm text-text-secondary">
                {show.language}
              </span>
            </>
          )}
        </div>

        {/* ── D. Genres ────────────────────────────────────────────────── */}
        {show.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {show.genres.map((genre) => (
              <span
                key={genre}
                className="
                  px-3 py-1 rounded-full text-xs font-medium
                  bg-bg-raised border border-white/10
                  text-text-secondary
                "
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* ── D2. Add to My Shows button ───────────────────────────────── */}
        <button
          onClick={() => {
            if (isTrackingLoaded && !isMutating) setSheetOpen(true);
          }}
          disabled={!isTrackingLoaded || isMutating}
          className={`
            w-full py-3.5 rounded-xl font-medium text-sm
            flex items-center justify-center gap-2
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isTracked
              ? "bg-accent/15 border border-accent/30 text-accent active:scale-[0.98]"
              : "bg-accent text-white active:scale-[0.98]"
            }
          `}
        >
          {/* Checkmark — shown when tracked */}
          {isTracked && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}

          {/* Label */}
          {!isTrackingLoaded || isMutating
            ? "Loading…"
            : isTracked
            ? STATUS_DISPLAY[trackingStatus!]
            : "Add to My Shows"
          }

          {/* Chevron — shown when tracked (indicates picker) */}
          {isTracked && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>

        {/* ── E. Summary ───────────────────────────────────────────────── */}
        {displayedSummary && (
          <div>
            <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              About
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {displayedSummary}
            </p>
            {isTruncatable && (
              <button
                onClick={() => setSummaryExpanded((p) => !p)}
                className="text-sm text-accent font-medium mt-2"
              >
                {summaryExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {/* ── F. Next Episode ──────────────────────────────────────────── */}
        {nextEp && (
          <div>
            <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Next Episode
            </h2>
            <div className="bg-bg-surface border border-white/5 rounded-xl p-4 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-accent">
                  {formatEpisodeCode(nextEp.season, nextEp.number)}
                </span>
                {nextEp.airdate && (
                  <span className="text-xs text-text-muted">
                    {formatDate(nextEp.airdate)}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-text-primary">
                {nextEp.name}
              </p>
              {nextEp.runtime && (
                <p className="text-xs text-text-muted">{nextEp.runtime}m</p>
              )}
            </div>
          </div>
        )}

        {/* ── G. Episodes ──────────────────────────────────────────────── */}
        {episodes.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
              Episodes{" "}
              <span className="font-light normal-case tracking-normal ml-1">
                ({episodes.length} total)
              </span>
            </h2>
            <div className="flex flex-col gap-2">
              {Array.from(seasonMap.entries()).map(([seasonNum, eps]) => {
                const isOpen = openSeasons.has(seasonNum);
                return (
                  <div
                    key={seasonNum}
                    className="border border-white/5 rounded-xl overflow-hidden"
                  >
                    {/* Season header */}
                    <button
                      onClick={() => toggleSeason(seasonNum)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-bg-surface text-left"
                    >
                      <span className="text-sm font-medium text-text-primary">
                        Season {seasonNum}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted">
                          {eps.length} eps
                        </span>
                        <motion.svg
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-text-muted flex-shrink-0"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </motion.svg>
                      </div>
                    </button>

                    {/* Episode list */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key={`season-${seasonNum}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="divide-y divide-white/5">
                            {eps.map((ep) => (
                              <div
                                key={ep.id}
                                className="px-4 py-3 flex items-start justify-between gap-3"
                              >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="text-xs font-mono text-accent">
                                    {formatEpisodeCode(ep.season, ep.number)}
                                  </span>
                                  <p className="text-sm text-text-primary leading-snug line-clamp-2">
                                    {ep.name}
                                  </p>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  {ep.airdate && (
                                    <span className="text-xs text-text-muted whitespace-nowrap">
                                      {formatDate(ep.airdate)}
                                    </span>
                                  )}
                                  {ep.runtime && (
                                    <p className="text-xs text-text-muted">
                                      {ep.runtime}m
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── H. Status picker bottom sheet ───────────────────────────────── */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="tracking-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
              onClick={() => setSheetOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="tracking-sheet"
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

              {/* Sheet title */}
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                Set Status
              </p>

              {/* Status options */}
              <div className="flex flex-col gap-2">
                {STATUS_OPTIONS.map(({ status, label, icon }) => {
                  const isSelected = trackingStatus === status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusSelect(status)}
                      className={`
                        flex items-center gap-3 px-4 py-3.5 rounded-xl
                        border transition-colors duration-150 text-left w-full
                        ${isSelected
                          ? "bg-accent/15 border-accent/40 text-accent"
                          : "bg-bg-raised border-white/5 text-text-secondary hover:border-white/15 hover:text-text-primary"
                        }
                      `}
                    >
                      <span className="flex-shrink-0">{icon}</span>
                      <span className="text-sm font-medium">{label}</span>
                      {isSelected && (
                        <svg className="ml-auto flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Remove from My Shows — only shown when currently tracked */}
              {isTracked && (
                <button
                  onClick={handleRemove}
                  className="
                    w-full mt-3 px-4 py-3.5 rounded-xl
                    border border-white/5 bg-bg-raised
                    text-red-400 text-sm font-medium
                    flex items-center justify-center gap-2
                    hover:border-red-500/30 hover:bg-red-500/10
                    transition-colors duration-150
                  "
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                  Remove from My Shows
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
