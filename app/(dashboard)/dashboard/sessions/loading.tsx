import { SkeletonBlock, SkeletonText } from "@/components/ui/primitives";

export default function SessionsLoading() {
  return (
    <section className="space-y-6" aria-busy="true">
      <div className="space-y-3">
        <SkeletonBlock className="h-10 w-48" />
        <SkeletonText className="h-4 w-full max-w-xl" />
      </div>
      <SkeletonBlock className="h-12 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-14 w-full" />
        ))}
      </div>
    </section>
  );
}
