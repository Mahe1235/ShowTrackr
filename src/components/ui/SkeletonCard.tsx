export default function SkeletonCard() {
  return (
    <div className="aspect-[2/3] rounded-xl bg-bg-raised animate-pulse" />
  );
}

export function SkeletonText({ className = "w-24" }: { className?: string }) {
  return (
    <div className={`h-4 rounded bg-bg-raised animate-pulse ${className}`} />
  );
}
