import Link from "next/link";
import type { ActivityType } from "@prisma/client";

import { ActivityBadge } from "@/components/sessions/activity-badge";
import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGlobalLeaderboard } from "@/lib/db/leaderboards";

function parseActivity(value: string | undefined): ActivityType {
  if (value === "SQUASH" || value === "PADEL") {
    return value;
  }

  return "CARD";
}

type GlobalLeaderboardPageProps = {
  searchParams: Promise<{
    activity?: string;
  }>;
};

export default async function GlobalLeaderboardPage({ searchParams }: GlobalLeaderboardPageProps) {
  await requireAuthenticatedUser();
  const { activity } = await searchParams;
  const activityType = parseActivity(activity);
  const leaderboard = await getGlobalLeaderboard({ activityType });

  return (
    <section className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>Global leaderboard</span>
            <ActivityBadge activityType={leaderboard.activityType} />
          </span>
        }
        description={
          activityType === "CARD"
            ? "OpenSkill ratings replayed from ranked card round finishes."
            : `Elo ratings replayed from ${activityType.toLowerCase()} match results.`
        }
        data-testid="global-leaderboard-heading"
        actions={
          <Link className="app-button app-button-secondary" href="/dashboard/leaderboards">
            Back to leaderboards
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {[
          { value: "CARD", label: "Card" },
          { value: "SQUASH", label: "Squash" },
          { value: "PADEL", label: "Padel" },
        ].map((entry) => (
          <Link
            key={entry.value}
            href={`/dashboard/leaderboards/global?activity=${entry.value}`}
            className={`app-button ${activityType === entry.value ? "app-button-primary" : "app-button-ghost"}`}
          >
            {entry.label}
          </Link>
        ))}
      </div>

      <LeaderboardTable rows={leaderboard.rows} activityType={leaderboard.activityType} scopeLabel="Global scope" />
    </section>
  );
}
