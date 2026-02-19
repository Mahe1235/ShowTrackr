"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import PageWrapper from "@/components/layout/PageWrapper";
import { createClient } from "@/lib/supabase/client";

interface SettingsViewProps {
  userEmail: string | null;
}

export default function SettingsView({ userEmail }: SettingsViewProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
  }

  return (
    <PageWrapper>
      <div className="pt-12 flex flex-col gap-6">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-text-secondary text-sm font-light">
            Profile and preferences.
          </p>
        </div>

        {userEmail ? (
          <div className="flex flex-col gap-3">
            {/* Section label */}
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Account
            </p>

            {/* Email card */}
            <div className="bg-bg-surface border border-white/5 rounded-xl px-4 py-3">
              <p className="text-xs text-text-muted">Signed in as</p>
              <p className="mt-0.5 text-sm text-text-primary font-medium">
                {userEmail}
              </p>
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full py-3.5 rounded-xl font-medium text-sm bg-bg-raised border border-white/10 text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors duration-150 active:scale-[0.98]"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-secondary">
              Sign in to access your account.
            </p>
            <Link
              href="/auth/sign-in"
              className="block w-full py-3.5 rounded-xl font-medium text-sm text-center bg-accent text-white active:scale-[0.98] transition-all duration-200"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* About & Feedback */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            About
          </p>
          <div className="bg-bg-surface border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
            {/* Feedback link */}
            <Link
              href="https://mahendrab.com/showtrackr#feedback"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors duration-150 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                <span className="text-sm text-text-primary">Share Feedback</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>

            {/* Project page link */}
            <Link
              href="https://mahendrab.com/showtrackr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors duration-150 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                </svg>
                <span className="text-sm text-text-primary">About ShowTrackr</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          </div>

          <p className="text-xs text-text-muted text-center">
            Show data from{" "}
            <Link
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent"
            >
              TMDB
            </Link>
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
