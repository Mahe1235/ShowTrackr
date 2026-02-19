"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("An account with this email already exists.");
        } else {
          setError(authError.message);
        }
        return;
      }
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-bg-raised border border-white/5 rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/40 transition-colors duration-200";

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="min-h-screen flex flex-col items-center justify-center px-4"
    >
      {/* Logo */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">ShowTrackr</h1>
        <p className="mt-1 text-text-muted text-sm font-light">
          Track your favorite TV shows
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-bg-surface border border-white/5 rounded-2xl p-6 mt-8">
        <h2 className="text-xl font-semibold mb-6">Create account</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted block">
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-medium text-sm bg-accent text-white active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-5 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link
            href="/auth/sign-in"
            className="text-accent font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </motion.main>
  );
}
