import { StatusBadge } from "@/components/ui/primitives";

export function ActivityBadge({ activityType }: { activityType: "CARD" | "SQUASH" | "PADEL" }) {
  if (activityType === "CARD") {
    return <StatusBadge tone="neutral">Card</StatusBadge>;
  }

  if (activityType === "SQUASH") {
    return <StatusBadge tone="accent">Squash</StatusBadge>;
  }

  return <StatusBadge tone="warning">Padel</StatusBadge>;
}
