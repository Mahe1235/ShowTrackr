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
      </div>
    </PageWrapper>
  );
}
