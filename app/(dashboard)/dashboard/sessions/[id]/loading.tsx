import { AppCard, SkeletonBlock, SkeletonText } from "@/components/ui/primitives";

export default function SessionDetailLoading() {
  return (
    <section className="space-y-6" aria-busy="true">
      <div className="space-y-3">
        <SkeletonBlock className="h-10 w-56" />
        <SkeletonText className="h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <AppCard key={i} className="space-y-3 p-4">
            <SkeletonText className="h-3 w-20" />
            <SkeletonBlock className="h-8 w-16" />
          </AppCard>
        ))}
      </div>
      <AppCard className="space-y-3">
        <SkeletonText className="h-4 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-full" />
        ))}
      </AppCard>
    </section>
  );
}
