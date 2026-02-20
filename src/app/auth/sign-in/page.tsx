"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

// ── Poster collage data ───────────────────────────────────────────────────────
// Hardcoded TMDB poster paths — mix of eras, genres, and cultures.
const ALL_POSTERS = [
  "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",  // Breaking Bad
  "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg", // Game of Thrones
  "/rTc7ZXdroqjkKivFPvCPX0Ru7OU.jpg", // The Sopranos
  "/f496cm9enuEsZkSPzCwnTESEK5s.jpg", // Friends
  "/4lbclFySvugI51fwsyxBTOm4DqK.jpg", // The Wire
  "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", // Stranger Things
  "/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg", // Chernobyl
  "/1M876KPjulVwppEpldhdc8V4o68.jpg", // The Crown
  "/apbrbWs5M9kQC35D5KBjSMFmhpP.jpg", // Dark
  "/e2X8g1fFk6xM1dETObOLKgScFzZ.jpg", // Succession
  "/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg", // The Last of Us
  "/z2yahl2uefxDCl0nogcRBstwruJ.jpg", // House of the Dragon
  "/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg", // Peaky Blinders
  "/pCGyPVrI9Fzw6rE1Pvi4BIXF6ET.jpg", // Ozark
  "/ea1HoLMHytfBFMqSWbVBjKpjuPZ.jpg", // Better Call Saul
  "/lgkgmus0zf9J8RL9JFm4zmALMb2.jpg", // Severance
  "/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg", // The Bear
  "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg", // Squid Game
];

// Split into 3 columns of 6 each
const COL1 = ALL_POSTERS.slice(0, 6);
const COL2 = ALL_POSTERS.slice(6, 12);
const COL3 = ALL_POSTERS.slice(12, 18);

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

// ── PosterColumn ─────────────────────────────────────────────────────────────

function PosterColumn({
  posters,
  direction,
  duration,
}: {
  posters: string[];
  direction: "up" | "down";
  duration: number;
}) {
  // Duplicate to make the loop seamless
  const doubled = [...posters, ...posters];
  const yStart = direction === "up" ? "0%" : "-50%";
  const yEnd   = direction === "up" ? "-50%" : "0%";

  return (
    <div className="flex-1 overflow-hidden">
      <motion.div
        animate={{ y: [yStart, yEnd] }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col"
      >
        {doubled.map((path, i) => (
          <div key={i} className="relative w-full aspect-[2/3] flex-shrink-0">
            <Image
              src={`${TMDB_IMG}${path}`}
              alt=""
              fill
              sizes="33vw"
              className="object-cover"
              priority={i < 3}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SignInPage() {
  async function handleGoogleSignIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">

      {/* ── Poster collage background ── */}
      <div className="absolute inset-0 flex">
        <PosterColumn posters={COL1} direction="up"   duration={30} />
        <PosterColumn posters={COL2} direction="down" duration={25} />
        <PosterColumn posters={COL3} direction="up"   duration={35} />
      </div>

      {/* ── Dark gradient overlay ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/90" />

      {/* ── Foreground content — bottom anchored ── */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-end pb-16 px-6">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg">
            ShowTrackr
          </h1>
          <p className="mt-2 text-white/60 text-sm font-light">
            Track every show. Never lose your place.
          </p>
        </motion.div>

        {/* Google button */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
          type="button"
          onClick={handleGoogleSignIn}
          className="
            w-full max-w-sm
            flex items-center justify-center gap-3
            py-4 rounded-2xl
            font-semibold text-sm
            bg-white text-gray-900
            active:scale-[0.98] transition-transform duration-100
            shadow-xl
          "
        >
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </motion.button>

      </div>
    </div>
  );
}
