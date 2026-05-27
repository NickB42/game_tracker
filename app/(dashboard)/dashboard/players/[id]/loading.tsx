import { AppCard, SkeletonBlock, SkeletonText } from "@/components/ui/primitives";

export default function PlayerDetailLoading() {
  return (
    <section className="space-y-6" aria-busy="true">
      <div className="space-y-3">
        <SkeletonBlock className="h-10 w-44" />
        <SkeletonText className="h-4 w-full max-w-md" />
      </div>
      <AppCard className="space-y-3">
        <SkeletonText className="h-4 w-28" />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-full" />
        ))}
      </AppCard>
    </section>
  );
}
