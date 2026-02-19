import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold tracking-tight">ShowTrackr</h1>
      <p className="mt-2 text-text-secondary text-sm font-light">
        Track your favorite TV shows
      </p>

      <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/auth/sign-in"
          className="block w-full py-3.5 rounded-xl font-medium text-sm text-center bg-accent text-white active:scale-[0.98] transition-all duration-200"
        >
          Sign In
        </Link>
        <Link
          href="/auth/sign-up"
          className="block w-full py-3.5 rounded-xl font-medium text-sm text-center bg-bg-surface border border-white/10 text-text-secondary hover:border-accent/40 hover:text-text-primary active:scale-[0.98] transition-all duration-200"
        >
          Create Account
        </Link>
      </div>
    </main>
  );
}
