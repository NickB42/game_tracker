import Link from "next/link";
import { notFound } from "next/navigation";
import type { ActivityType } from "@prisma/client";

import { RatingHistoryChart } from "@/components/leaderboards/rating-history-chart";
import { AppButton, Divider, EmptyState, InfoRow, PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGlobalLeaderboard } from "@/lib/db/leaderboards";
import { getPlayerById } from "@/lib/db/players";

type PlayerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    activity?: string;
  }>;
};

function parseActivity(value: string | undefined): ActivityType {
  if (value === "SQUASH" || value === "PADEL") {
    return value;
  }

  return "CARD";
}

function formatRatingDelta(value: number) {
  const rounded = Number(value.toFixed(1));
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

export default async function PlayerDetailPage({ params, searchParams }: PlayerDetailPageProps) {
  const user = await requireAuthenticatedUser();
  const [{ id }, { activity }] = await Promise.all([params, searchParams]);
  const activityType = parseActivity(activity);

  const [player, leaderboard] = await Promise.all([
    getPlayerById(id),
    getGlobalLeaderboard({ activityType }),
  ]);

  if (!player) {
    notFound();
  }

  const ratingRow = leaderboard.rows.find((row) => row.playerId === player.id);
  const playerHistory = leaderboard.history.filter((entry) => entry.playerId === player.id);
  const historyPoints = playerHistory[0]?.points ?? [];
  const peakRating = historyPoints.length > 0 ? Math.max(...historyPoints.map((point) => point.rating)) : null;
  const totalRatingChange = historyPoints.reduce((total, point) => total + point.delta, 0);
  const ratingLabel = activityType === "CARD" ? "OpenSkill" : "Elo";

  return (
    <section className="space-y-6">
      <PageHeader
        title={player.displayName}
        data-testid="player-detail-heading"
        actions={
          <div className="flex flex-wrap gap-2">
            <AppButton variant="secondary" href="/dashboard/players">
              Back to players
            </AppButton>
            {user.role === "ADMIN" ? <AppButton href={`/dashboard/players/${player.id}/edit`}>Edit player</AppButton> : null}
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Status" value={player.isActive ? "Active" : "Inactive"} tone={player.isActive ? "success" : "warning"} />
        <StatCard label="Groups" value={player.groupMemberships.length} tone="accent" />
        <StatCard label="Session participations" value={player._count.sessionParticipants} />
      </div>

      <SectionCard title="Player profile">
        <dl className="rounded-[var(--radius-md)] border border-[var(--border)]">
          <InfoRow
            label="Active"
            value={<StatusBadge tone={player.isActive ? "success" : "warning"}>{player.isActive ? "Yes" : "No"}</StatusBadge>}
          />
          <Divider />
          <InfoRow label="Display name" value={player.displayName} />
        </dl>
      </SectionCard>

      <SectionCard title="Global rating history">
        <div className="mb-4 flex flex-wrap gap-2" aria-label="Rating history activity">
          {[
            { value: "CARD", label: "Card" },
            { value: "SQUASH", label: "Squash" },
            { value: "PADEL", label: "Padel" },
          ].map((entry) => (
            <Link
              key={entry.value}
              href={`/dashboard/players/${player.id}?activity=${entry.value}`}
              className={`app-button ${activityType === entry.value ? "app-button-primary" : "app-button-ghost"}`}
            >
              {entry.label}
            </Link>
          ))}
        </div>

        {historyPoints.length > 0 ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatCard label={`Current ${ratingLabel}`} value={ratingRow?.displayedRating.toFixed(1) ?? "-"} tone="accent" />
            <StatCard label={`Peak ${ratingLabel}`} value={peakRating?.toFixed(1) ?? "-"} tone="success" />
            <StatCard
              label="Total change"
              value={formatRatingDelta(totalRatingChange)}
              tone={totalRatingChange > 0 ? "success" : totalRatingChange < 0 ? "warning" : "default"}
            />
          </div>
        ) : null}

        <RatingHistoryChart
          key={`player-${player.id}-${activityType}`}
          series={playerHistory}
          activityType={activityType}
          focusPlayerId={player.id}
        />
      </SectionCard>

      <SectionCard title="Notes">
        {player.notes ? <p className="text-sm text-[var(--text-secondary)]">{player.notes}</p> : <EmptyState title="No notes yet" description="Add context such as aliases or seating preferences from the edit view." />}
      </SectionCard>

      <SectionCard title="Groups">
        {player.groupMemberships.length === 0 ? (
          <EmptyState title="No memberships" description="This player is not assigned to any group yet." />
        ) : (
          <ul className="space-y-2">
            {player.groupMemberships.map((membership) => (
              <li key={membership.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">{membership.group.name}</span>
                <Link className="app-button app-button-ghost" href={`/dashboard/groups/${membership.group.id}`}>
                  Open group
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </section>
  );
}
