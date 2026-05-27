import { AppCard, SkeletonBlock, SkeletonText } from "@/components/ui/primitives";

export default function GroupEditLoading() {
  return (
    <section className="space-y-6" aria-busy="true">
      <div className="space-y-3">
        <SkeletonBlock className="h-10 w-48" />
        <SkeletonText className="h-4 w-full max-w-lg" />
      </div>
      <AppCard className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-12 w-full" />
        ))}
        <SkeletonBlock className="h-10 w-40" />
      </AppCard>
    </section>
  );
}
