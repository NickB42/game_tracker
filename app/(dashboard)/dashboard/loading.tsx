import { AppCard, SkeletonBlock, SkeletonText } from "@/components/ui/primitives";

export default function DashboardLoading() {
  return (
    <section className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <SkeletonBlock className="h-10 w-64" />
        <SkeletonText className="h-4 w-full max-w-2xl" />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <AppCard key={`stat-skeleton-${index}`} className="space-y-3 p-4">
            <SkeletonText className="h-3 w-24" />
            <SkeletonBlock className="h-8 w-20" />
            <SkeletonText className="h-3 w-28" />
          </AppCard>
        ))}
      </div>

      <AppCard className="space-y-4">
        <SkeletonText className="h-4 w-40" />
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={`row-skeleton-${index}`} className="h-10 w-full" />
        ))}
      </AppCard>
    </section>
  );
}
