"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import PageWrapper from "@/components/layout/PageWrapper";
import UserShowCard from "@/components/ui/UserShowCard";
import type { EnrichedUserShow, ShowStatus } from "@/types";

// ── Constants + pure helpers (outside component) ──────────────────────────

type TabId = "all" | ShowStatus;

const TABS: { id: TabId; label: string }[] = [
  { id: "all",           label: "All"           },
  { id: "watching",      label: "Watching"      },
  { id: "plan_to_watch", label: "Plan to Watch" },
  { id: "completed",     label: "Completed"     },
  { id: "on_hold",       label: "On Hold"       },
  { id: "dropped",       label: "Dropped"       },
];

function filterShows(shows: EnrichedUserShow[], tab: TabId): EnrichedUserShow[] {
  if (tab === "all") return shows;
  return shows.filter((s) => s.status === tab);
}

const gridContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

// ── Component ──────────────────────────────────────────────────────────────

interface MyShowsViewProps {
  initialShows: EnrichedUserShow[];
  isLoggedIn: boolean;
}

export default function MyShowsView({ initialShows, isLoggedIn }: MyShowsViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("all");

  // Count per status — memoised because it iterates all shows
  const countByStatus = useMemo(() => {
    const map: Partial<Record<TabId, number>> = { all: initialShows.length };
    for (const s of initialShows) {
      map[s.status] = (map[s.status] ?? 0) + 1;
    }
    return map;
  }, [initialShows]);

  const displayedShows = filterShows(initialShows, activeTab);

  return (
    <PageWrapper>
      <div className="pt-12 flex flex-col gap-6 pb-6">

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold">My Shows</h1>
          <p className="mt-1 text-text-secondary text-sm font-light">
            {isLoggedIn
              ? `${initialShows.length} show${initialShows.length !== 1 ? "s" : ""} tracked`
              : "Track your favourite shows"}
          </p>
        </div>

        {/* Tab bar — horizontal scroll, same -mx-4 px-4 pattern as genre chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {TABS.map(({ id, label }) => {
            const count = countByStatus[id] ?? 0;
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  flex-shrink-0 flex items-center gap-1.5
                  px-3.5 py-1.5 rounded-full text-xs font-medium
                  border transition-colors duration-150
                  ${isActive
                    ? "bg-accent border-accent text-white"
                    : "bg-bg-surface border-white/10 text-text-secondary hover:border-accent/40 hover:text-text-primary"
                  }
                `}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`
                      inline-flex items-center justify-center
                      min-w-[16px] h-4 px-1 rounded-full
                      text-[10px] font-semibold
                      ${isActive
                        ? "bg-white/20 text-white"
                        : "bg-bg-raised text-text-muted"
                      }
                    `}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Grid area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Not logged in */}
            {!isLoggedIn && (
              <div className="py-20 flex flex-col items-center gap-3 text-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-text-muted"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
                <p className="text-text-primary font-medium">Track your shows</p>
                <p className="text-text-muted text-sm max-w-[220px]">
                  Sign in to start building your watchlist
                </p>
                <Link
                  href="/auth/sign-in"
                  className="mt-1 px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-medium active:scale-[0.98] transition-all duration-200 inline-block"
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* Logged in — all tab — zero shows */}
            {isLoggedIn && displayedShows.length === 0 && activeTab === "all" && (
              <div className="py-20 flex flex-col items-center gap-3 text-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-text-muted"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
                <p className="text-text-primary font-medium">No shows yet</p>
                <p className="text-text-muted text-sm max-w-[220px]">
                  Search for a show and tap &ldquo;Add to My Shows&rdquo; to get started
                </p>
              </div>
            )}

            {/* Logged in — filtered tab — zero shows */}
            {isLoggedIn && displayedShows.length === 0 && activeTab !== "all" && (
              <div className="py-16 flex flex-col items-center gap-2 text-center">
                <p className="text-text-primary font-medium">Nothing here yet</p>
                <p className="text-text-muted text-sm">
                  No shows with this status
                </p>
              </div>
            )}

            {/* Grid */}
            {displayedShows.length > 0 && (
              <motion.div
                variants={gridContainerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 gap-3"
              >
                {displayedShows.map((userShow, index) => (
                  <UserShowCard
                    key={userShow.id}
                    userShow={userShow}
                    priority={index < 4}
                    newSeasonComingSoon={userShow.newSeasonComingSoon}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </PageWrapper>
  );
}
