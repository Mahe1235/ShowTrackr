"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import type { TVMazeShow } from "@/types";

interface ShowCardProps {
  show: TVMazeShow;
  priority?: boolean;
}

// Exported so the parent grid container can use staggerChildren
export const showCardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

export default function ShowCard({ show, priority = false }: ShowCardProps) {
  const imageUrl = show.image?.medium ?? show.image?.original ?? null;
  const year = show.premiered ? show.premiered.slice(0, 4) : null;
  const networkName = show.network?.name ?? show.webChannel?.name ?? null;

  return (
    <Link href={`/show/${show.id}`} className="block">
      <motion.div
        variants={showCardVariants}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="flex flex-col gap-2"
      >
        {/* Poster */}
        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-bg-raised relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={show.name}
              fill
              sizes="(max-width: 768px) 50vw, 200px"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-3">
              <span className="text-text-muted text-xs text-center leading-relaxed line-clamp-3">
                {show.name}
              </span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-col gap-0.5 px-0.5">
          <p className="text-text-primary text-sm font-medium leading-tight line-clamp-1">
            {show.name}
          </p>
          {(year || networkName) && (
            <p className="text-text-muted text-xs font-light line-clamp-1">
              {[year, networkName].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
