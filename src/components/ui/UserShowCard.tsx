"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { showCardVariants } from "@/components/ui/ShowCard";
import type { UserShow, ShowStatus } from "@/types";

// ── Status badge configuration (outside component — never re-created) ──────

const STATUS_CONFIG: Record<ShowStatus, { label: string; color: string }> = {
  watching:      { label: "Watching",      color: "bg-green-500/15 text-green-400 border-green-500/20"    },
  plan_to_watch: { label: "Plan to Watch", color: "bg-accent/15 text-accent border-accent/20"             },
  completed:     { label: "Completed",     color: "bg-sky-500/15 text-sky-400 border-sky-500/20"          },
  on_hold:       { label: "On Hold",       color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  dropped:       { label: "Dropped",       color: "bg-red-500/15 text-red-400 border-red-500/20"          },
};

// ── Component ──────────────────────────────────────────────────────────────

interface UserShowCardProps {
  userShow: UserShow;
  priority?: boolean;
  newSeasonComingSoon?: boolean;
}

export default function UserShowCard({ userShow, priority = false, newSeasonComingSoon = false }: UserShowCardProps) {
  const { show_name, show_poster, tvmaze_show_id, status } = userShow;
  const badge = STATUS_CONFIG[status];

  return (
    <Link href={`/show/${tvmaze_show_id}`} className="block">
      <motion.div
        variants={showCardVariants}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="flex flex-col gap-2"
      >
        {/* Poster */}
        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-bg-raised relative">
          {show_poster ? (
            <Image
              src={show_poster}
              alt={show_name}
              fill
              sizes="(max-width: 768px) 50vw, 200px"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-3">
              <span className="text-text-muted text-xs text-center leading-relaxed line-clamp-3">
                {show_name}
              </span>
            </div>
          )}

          {/* "New Season Soon" tag — top-left */}
          {newSeasonComingSoon && (
            <div
              className="
                absolute top-2 left-2
                px-2 py-0.5 rounded-full
                text-[9px] font-semibold
                bg-amber-500/90 text-black
                backdrop-blur-sm
              "
            >
              New Season Soon
            </div>
          )}

          {/* Status badge — overlaid on poster bottom-left */}
          <div
            className={`
              absolute bottom-2 left-2
              px-2 py-0.5 rounded-full
              text-[10px] font-medium border
              backdrop-blur-sm
              ${badge.color}
            `}
          >
            {badge.label}
          </div>
        </div>

        {/* Show name */}
        <p className="text-text-primary text-sm font-medium leading-tight line-clamp-1 px-0.5">
          {show_name}
        </p>
      </motion.div>
    </Link>
  );
}
