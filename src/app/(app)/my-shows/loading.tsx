import PageWrapper from "@/components/layout/PageWrapper";
import SkeletonCard, { SkeletonText } from "@/components/ui/SkeletonCard";

export default function MyShowsLoading() {
  return (
    <PageWrapper>
      <div className="pt-12 flex flex-col gap-6">
        {/* Header skeleton */}
        <div className="flex flex-col gap-2">
          <div className="h-8 w-32 bg-bg-raised rounded-lg animate-pulse" />
          <div className="h-4 w-24 bg-bg-raised rounded animate-pulse" />
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 h-7 w-20 rounded-full bg-bg-raised animate-pulse"
            />
          ))}
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <SkeletonCard />
              <SkeletonText className="w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
