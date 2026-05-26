import { StatusBadge } from "@/components/ui/primitives";

export function formatActivityType(activityType: "CARD" | "SQUASH" | "PADEL") {
  if (activityType === "CARD") {
    return "Card";
  }

  if (activityType === "SQUASH") {
    return "Squash";
  }

  return "Padel";
}

export function ActivityBadge({ activityType }: { activityType: "CARD" | "SQUASH" | "PADEL" }) {
  if (activityType === "CARD") {
    return <StatusBadge tone="neutral">{formatActivityType(activityType)}</StatusBadge>;
  }

  if (activityType === "SQUASH") {
    return <StatusBadge tone="accent">{formatActivityType(activityType)}</StatusBadge>;
  }

  return <StatusBadge tone="warning">{formatActivityType(activityType)}</StatusBadge>;
}
