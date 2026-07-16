import Link from "next/link";
import type { ActivityType } from "@prisma/client";

import { RatingHistoryChart } from "@/components/leaderboards/rating-history-chart";
import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { AppButton, PageHeader, SectionCard } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGlobalLeaderboard } from "@/lib/db/leaderboards";
import { measureAsync } from "@/lib/server/timing";

function parseActivity(value: string | undefined): ActivityType {
  if (value === "SQUASH" || value === "PADEL") {
    return value;
  }

  return "CARD";
}

type GlobalLeaderboardPageProps = {
  searchParams: Promise<{
    activity?: string;
    view?: string;
  }>;
};

function parseView(value: string | undefined) {
  return value === "history" ? "history" : "standings";
}

export default async function GlobalLeaderboardPage({ searchParams }: GlobalLeaderboardPageProps) {
  await measureAsync("dashboard.leaderboards.global.auth", () => requireAuthenticatedUser());
  const { activity, view: viewParam } = await searchParams;
  const activityType = parseActivity(activity);
  const view = parseView(viewParam);
  const leaderboard = await measureAsync("dashboard.leaderboards.global.compute", () =>
    getGlobalLeaderboard({ activityType }),
  );

  return (
    <section className="space-y-6">
      <PageHeader
        title="Global leaderboard"
        data-testid="global-leaderboard-heading"
        actions={
          <AppButton href="/dashboard/leaderboards" variant="secondary" className="app-icon-button">
            <ArrowLeftIcon />
            <span className="sr-only">Back to leaderboards</span>
          </AppButton>
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
            href={`/dashboard/leaderboards/global?activity=${entry.value}&view=${view}`}
            className={`app-button ${activityType === entry.value ? "app-button-primary" : "app-button-ghost"}`}
          >
            {entry.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Leaderboard view">
        <Link
          href={`/dashboard/leaderboards/global?activity=${activityType}&view=standings`}
          className={`app-button ${view === "standings" ? "app-button-secondary" : "app-button-ghost"}`}
        >
          Standings
        </Link>
        <Link
          href={`/dashboard/leaderboards/global?activity=${activityType}&view=history`}
          className={`app-button ${view === "history" ? "app-button-secondary" : "app-button-ghost"}`}
        >
          Rating history
        </Link>
      </div>

      {view === "history" ? (
        <SectionCard title="Global rating history">
          <RatingHistoryChart
            key={`global-${activityType}`}
            series={leaderboard.history}
            activityType={leaderboard.activityType}
          />
        </SectionCard>
      ) : (
        <LeaderboardTable rows={leaderboard.rows} activityType={leaderboard.activityType} scopeLabel="Global scope" />
      )}
    </section>
  );
}
