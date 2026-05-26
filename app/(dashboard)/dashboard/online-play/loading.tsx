import { SkeletonBlock, SkeletonText } from "@/components/ui/primitives";

export default function OnlinePlayLoading() {
  return (
    <section className="space-y-6" aria-busy="true">
      <div className="space-y-3">
        <SkeletonBlock className="h-10 w-44" />
        <SkeletonText className="h-4 w-full max-w-md" />
      </div>
      <SkeletonBlock className="h-40 w-full" />
    </section>
  );
}
