"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { TVMazeShow, UserShow, ShowStatus } from "@/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const STATUS_CONFIG: Record<ShowStatus, { label: string; color: string }> = {
  watching:      { label: "Watching",      color: "bg-green-500/15 text-green-400 border-green-500/20"    },
  plan_to_watch: { label: "Plan to Watch", color: "bg-accent/15 text-accent border-accent/20"             },
  completed:     { label: "Completed",     color: "bg-sky-500/15 text-sky-400 border-sky-500/20"          },
  on_hold:       { label: "On Hold",       color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  dropped:       { label: "Dropped",       color: "bg-red-500/15 text-red-400 border-red-500/20"          },
};

const GENRES = ["Drama", "Comedy", "Crime", "Sci-Fi", "Action", "Thriller", "Fantasy", "Animation"];

// ── Sub-components ───────────────────────────────────────────────────────────

/** Compact horizontal-rail card for a TVMaze show (from popular shows) */
function TrendingCard({ show, priority = false }: { show: TVMazeShow; priority?: boolean }) {
  const imageUrl = show.image?.medium ?? show.image?.original ?? null;
  return (
    <Link href={`/show/${show.id}`} className="block w-[110px] flex-shrink-0">
      <motion.div
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="flex flex-col gap-1.5"
      >
        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-bg-raised relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={show.name}
              fill
              sizes="110px"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2">
              <span className="text-text-muted text-[10px] text-center leading-relaxed line-clamp-3">
                {show.name}
              </span>
            </div>
          )}
        </div>
        <p className="text-text-primary text-xs font-medium leading-tight line-clamp-2 px-0.5">
          {show.name}
        </p>
      </motion.div>
    </Link>
  );
}

/** Compact horizontal-rail card for a user's tracked show */
function UserRailCard({ userShow, priority = false }: { userShow: UserShow; priority?: boolean }) {
  const { show_name, show_poster, tvmaze_show_id, status } = userShow;
  const badge = STATUS_CONFIG[status];
  return (
    <Link href={`/show/${tvmaze_show_id}`} className="block w-[110px] flex-shrink-0">
      <motion.div
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="flex flex-col gap-1.5"
      >
        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-bg-raised relative">
          {show_poster ? (
            <Image
              src={show_poster}
              alt={show_name}
              fill
              sizes="110px"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2">
              <span className="text-text-muted text-[10px] text-center leading-relaxed line-clamp-3">
                {show_name}
              </span>
            </div>
          )}
          {/* Status badge */}
          <div
            className={`
              absolute bottom-1.5 left-1.5
              px-1.5 py-0.5 rounded-full
              text-[9px] font-medium border
              backdrop-blur-sm
              ${badge.color}
            `}
          >
            {badge.label}
          </div>
        </div>
        <p className="text-text-primary text-xs font-medium leading-tight line-clamp-2 px-0.5">
          {show_name}
        </p>
      </motion.div>
    </Link>
  );
}

/** Section header row */
function SectionHeader({
  title,
  href,
  linkLabel = "See all",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-xs text-accent font-medium">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface HomeViewProps {
  popularShows: TVMazeShow[];
  userShows: UserShow[];
  isLoggedIn: boolean;
}

export default function HomeView({ popularShows, userShows, isLoggedIn }: HomeViewProps) {
  const greeting = getGreeting();

  const watchingShows = userShows.filter((s) => s.status === "watching");
  const planToWatchShows = userShows.filter((s) => s.status === "plan_to_watch");

  const watchingCount = watchingShows.length;
  const totalCount = userShows.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-8 pt-12 pb-8"
    >

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        {isLoggedIn && totalCount > 0 ? (
          <p className="text-text-muted text-sm font-light">
            {totalCount} show{totalCount !== 1 ? "s" : ""} tracked
            {watchingCount > 0 && ` · ${watchingCount} watching`}
          </p>
        ) : (
          <p className="text-text-muted text-sm font-light">
            Find your next favourite show
          </p>
        )}
      </div>

      {/* ── Search shortcut ─────────────────────────────────────────────── */}
      <Link
        href="/search"
        className="flex items-center gap-3 bg-bg-surface border border-white/5 rounded-xl px-4 py-3 transition-colors duration-150 hover:border-white/10 active:scale-[0.98]"
      >
        <svg
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
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="text-text-muted text-sm">Search shows…</span>
      </Link>

      {/* ── Continue Watching ────────────────────────────────────────────── */}
      {watchingShows.length > 0 && (
        <div>
          <SectionHeader title="Continue Watching" href="/my-shows" />
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {watchingShows.slice(0, 10).map((show, i) => (
              <UserRailCard key={show.id} userShow={show} priority={i < 3} />
            ))}
          </div>
        </div>
      )}

      {/* ── Up Next ─────────────────────────────────────────────────────── */}
      {planToWatchShows.length > 0 && (
        <div>
          <SectionHeader title="Up Next" href="/my-shows" />
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {planToWatchShows.slice(0, 10).map((show, i) => (
              <UserRailCard key={show.id} userShow={show} priority={i < 3} />
            ))}
          </div>
        </div>
      )}

      {/* ── Logged in, no shows yet ──────────────────────────────────────── */}
      {isLoggedIn && totalCount === 0 && (
        <div className="bg-bg-surface border border-white/5 rounded-2xl px-5 py-6 flex flex-col gap-2">
          <p className="text-text-primary font-medium text-sm">Start your watchlist</p>
          <p className="text-text-muted text-xs leading-relaxed">
            Search for a show and tap &ldquo;Add to My Shows&rdquo; to start tracking.
          </p>
          <Link
            href="/search"
            className="mt-1 self-start px-4 py-2 rounded-xl bg-accent text-white text-xs font-medium active:scale-[0.98] transition-all duration-200"
          >
            Browse shows
          </Link>
        </div>
      )}

      {/* ── Trending Now ────────────────────────────────────────────────── */}
      {popularShows.length > 0 && (
        <div>
          <SectionHeader title="Trending Now" href="/search" linkLabel="Explore" />
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {popularShows.slice(0, 15).map((show, i) => (
              <TrendingCard key={show.id} show={show} priority={i < 3} />
            ))}
          </div>
        </div>
      )}

      {/* ── Explore by Genre ────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Explore" />
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {GENRES.map((genre) => (
            <Link
              key={genre}
              href={`/search?genre=${encodeURIComponent(genre)}`}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border bg-bg-surface border-white/10 text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors duration-150"
            >
              {genre}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Sign-in CTA (logged out only) ────────────────────────────────── */}
      {!isLoggedIn && (
        <div className="bg-bg-surface border border-white/5 rounded-2xl px-5 py-6 flex flex-col gap-2">
          <p className="text-text-primary font-medium text-sm">Track what you watch</p>
          <p className="text-text-muted text-xs leading-relaxed">
            Sign in to save shows, track your progress, and pick up right where you left off.
          </p>
          <div className="flex gap-2 mt-1">
            <Link
              href="/auth/sign-in"
              className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-medium active:scale-[0.98] transition-all duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/auth/sign-up"
              className="px-4 py-2 rounded-xl bg-bg-raised border border-white/10 text-text-secondary text-xs font-medium active:scale-[0.98] transition-all duration-200"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}

    </motion.div>
  );
}
