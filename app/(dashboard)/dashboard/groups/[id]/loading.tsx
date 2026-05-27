import { AppCard, SkeletonBlock, SkeletonText } from "@/components/ui/primitives";

export default function GroupDetailLoading() {
  return (
    <section className="space-y-6" aria-busy="true">
      <div className="space-y-3">
        <SkeletonBlock className="h-10 w-48" />
        <SkeletonText className="h-4 w-full max-w-lg" />
      </div>
      <AppCard className="space-y-3">
        <SkeletonText className="h-4 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-full" />
        ))}
      </AppCard>
      <AppCard className="space-y-3">
        <SkeletonText className="h-4 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-8 w-full" />
        ))}
      </AppCard>
    </section>
  );
}
