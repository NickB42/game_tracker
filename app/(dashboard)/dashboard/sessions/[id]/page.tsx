import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityBadge } from "@/components/sessions/activity-badge";
import { CardRoundsSection } from "@/components/sessions/card-rounds-section";
import { SportsMatchesSection } from "@/components/sessions/sports-matches-section";
import { AppButton, DataTable, Divider, EmptyState, InfoRow, PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditSession } from "@/lib/domain/authorization";
import { getSportsMatchesByGameSessionId } from "@/lib/db/matches";
import { getRoundsByGameSessionId, getSessionRoundSummary } from "@/lib/db/rounds";
import { getGameSessionAuthorizationContext, getGameSessionById } from "@/lib/db/sessions";

type SessionDetailView = {
  id: string;
  activityType: "CARD" | "SQUASH" | "PADEL";
  title: string | null;
  playedAt: Date;
  notes: string | null;
  groupId: string | null;
  group: { id: string; name: string } | null;
  ownerUser: { id: string; name: string };
  createdByUser: { id: string; name: string } | null;
  trustedAdmins: Array<{ id: string; userId: string; user: { id: string; name: string; email: string } }>;
  participants: Array<{ id: string; player: { id: string; displayName: string; isActive: boolean } }>;
};

type RoundView = {
  id: string;
  sequenceNumber: number;
  notes: string | null;
  placements: Array<{
    id: string;
    sessionParticipant: {
      player: {
        id: string;
        displayName: string;
      };
    };
  }>;
};

type SessionSummaryView = {
  roundsPlayed: number;
  participants: Array<{ sessionParticipantId: string; playerId: string; playerDisplayName: string; roundWins: number }>;
  matchWinnerSessionParticipantIds: string[];
};

type SportsMatchView = {
  id: string;
  sequenceNumber: number;
  notes: string | null;
  participants: Array<{
    id: string;
    sideNumber: number | null;
    player: {
      id: string;
      displayName: string;
      isActive: boolean;
    };
  }>;
  result: {
    winningSideNumber: number | null;
    scoreLines: Array<{
      id: string;
      sequenceNumber: number;
      sideNumber: number;
      score: number;
    }>;
  } | null;
};

type GameSessionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function GameSessionDetailPage({ params }: GameSessionDetailPageProps) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;

  const [gameSessionRaw, sessionContext] = await Promise.all([
    getGameSessionById(id, user),
    getGameSessionAuthorizationContext(id, user),
  ]);

  if (!gameSessionRaw || !sessionContext) {
    notFound();
  }

  const gameSession = gameSessionRaw as unknown as SessionDetailView;
  const canManageSession = canEditSession(user, sessionContext);

  let rounds: RoundView[] = [];
  let summary: SessionSummaryView | null = null;
  let sportsMatches: SportsMatchView[] = [];

  if (gameSession.activityType === "CARD") {
    const [roundsRaw, summaryRaw] = await Promise.all([getRoundsByGameSessionId(id), getSessionRoundSummary(id)]);
    rounds = roundsRaw as RoundView[];
    summary = summaryRaw as SessionSummaryView;
  } else {
    const sportsMatchesRaw = await getSportsMatchesByGameSessionId(id);
    sportsMatches = sportsMatchesRaw as SportsMatchView[];
  }

  const matchWinnerNameSet = new Set(
    summary
      ? summary.participants
          .filter((participant) => summary.matchWinnerSessionParticipantIds.includes(participant.sessionParticipantId))
          .map((participant) => participant.playerDisplayName)
      : [],
  );

  return (
    <section className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>{gameSession.title ?? "Untitled session"}</span>
            <ActivityBadge activityType={gameSession.activityType} />
          </span>
        }
        description={
          gameSession.activityType === "CARD"
            ? "One session is one game night; rounds capture each short game in order."
            : "One session can contain multiple manually entered sports matches."
        }
        actions={
          <>
            <AppButton href="/dashboard/sessions" variant="ghost">
              Back to Sessions
            </AppButton>
            <AppButton href="/dashboard/leaderboards/global" variant="secondary">
              Global Leaderboard
            </AppButton>
            {canManageSession ? (
              <>
                <AppButton href={`/dashboard/sessions/${gameSession.id}/edit`} variant="secondary">
                  Edit Session
                </AppButton>
                {gameSession.activityType === "CARD" ? (
                  <AppButton href={`/dashboard/sessions/${gameSession.id}/rounds/new`} data-testid="session-add-round-link">
                    Add Round
                  </AppButton>
                ) : (
                  <AppButton href={`/dashboard/sessions/${gameSession.id}/matches/new`}>Add Match</AppButton>
                )}
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Played at" value={formatDateTime(gameSession.playedAt)} />
        <StatCard label="Participants" value={gameSession.participants.length} tone="accent" />
        <StatCard label="Trusted admins" value={gameSession.trustedAdmins.length} tone="warning" />
        {gameSession.activityType === "CARD" ? (
          <StatCard
            label="Winner"
            value={matchWinnerNameSet.size > 0 ? [...matchWinnerNameSet].join(", ") : "No winner yet"}
            tone={matchWinnerNameSet.size > 0 ? "success" : "default"}
          />
        ) : (
          <StatCard
            label="Recorded matches"
            value={sportsMatches.length}
            tone={sportsMatches.length > 0 ? "success" : "default"}
          />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Session Overview">
          <dl className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
            <InfoRow
              label="Group"
              value={
                gameSession.group ? (
                  <Link className="underline" href={`/dashboard/groups/${gameSession.group.id}`}>
                    {gameSession.group.name}
                  </Link>
                ) : (
                  "No group"
                )
              }
            />
            <InfoRow label="Owner" value={gameSession.ownerUser.name} />
            <InfoRow label="Created by" value={gameSession.createdByUser?.name ?? "Unknown"} />
            <InfoRow label="Activity" value={<ActivityBadge activityType={gameSession.activityType} />} />
            <InfoRow label={gameSession.activityType === "CARD" ? "Rounds played" : "Matches played"} value={gameSession.activityType === "CARD" ? (summary?.roundsPlayed ?? 0) : sportsMatches.length} />
          </dl>

          <Divider className="my-5" />

          <h3 className="app-section-title text-base">Session summary</h3>
          {gameSession.activityType !== "CARD" ? (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Sports sessions track manual matches. Leaderboards and ratings for sports will be enabled in a later phase.
            </p>
          ) : summary && summary.participants.length > 0 ? (
            <div className="mt-3">
              <DataTable>
                <table className="app-table min-w-full">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Round wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.participants
                      .slice()
                      .sort((a, b) => {
                        if (b.roundWins !== a.roundWins) {
                          return b.roundWins - a.roundWins;
                        }

                        return a.playerDisplayName.localeCompare(b.playerDisplayName);
                      })
                      .map((participant) => (
                        <tr key={participant.sessionParticipantId}>
                          <td>
                            <Link className="underline" href={`/dashboard/players/${participant.playerId}`}>
                              {participant.playerDisplayName}
                            </Link>
                          </td>
                          <td>{participant.roundWins}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </DataTable>
            </div>
          ) : (
            <EmptyState title="No participants" description="Add participants to start tracking round wins." />
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Trusted Admins">
            {gameSession.trustedAdmins.length === 0 ? (
              <EmptyState title="No trusted admins" description="Only owner-level permissions are active for this session." />
            ) : (
              <ul className="space-y-2">
                {gameSession.trustedAdmins.map((trustedAdmin) => (
                  <li key={trustedAdmin.id} className="app-card-muted px-3 py-2 text-sm text-[var(--text-secondary)]">
                    {trustedAdmin.user.name}
                    <span className="ml-2 text-xs text-[var(--text-muted)]">({trustedAdmin.user.email})</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Notes">
            <p className="app-card-muted px-4 py-3 text-sm text-[var(--text-secondary)]">{gameSession.notes ?? "No notes"}</p>
          </SectionCard>

          <SectionCard title="Participants">
            {gameSession.participants.length === 0 ? (
              <EmptyState title="No participants" description="No participants are currently assigned to this session." />
            ) : (
              <ul className="space-y-2">
                {gameSession.participants.map((participant) => (
                  <li key={participant.id} className="app-card-muted flex items-center justify-between px-3 py-2 text-sm">
                    <Link className="font-medium text-[var(--text-primary)] underline" href={`/dashboard/players/${participant.player.id}`}>
                      {participant.player.displayName}
                    </Link>
                    <StatusBadge tone={participant.player.isActive ? "success" : "warning"}>
                      {participant.player.isActive ? "Active" : "Inactive"}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {gameSession.activityType === "CARD" ? (
        <CardRoundsSection
          gameSessionId={gameSession.id}
          groupId={gameSession.groupId}
          rounds={rounds}
          canManageSession={canManageSession}
        />
      ) : (
        <SportsMatchesSection
          gameSessionId={gameSession.id}
          activityType={gameSession.activityType}
          canManageSession={canManageSession}
          matches={sportsMatches}
        />
      )}
    </section>
  );
}
