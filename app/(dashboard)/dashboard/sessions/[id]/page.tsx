import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteRoundAction } from "@/actions/rounds";
import { AppButton, DataTable, Divider, EmptyState, InfoRow, PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditSession } from "@/lib/domain/authorization";
import { getRoundsByGameSessionId, getSessionRoundSummary } from "@/lib/db/rounds";
import { getGameSessionAuthorizationContext, getGameSessionById } from "@/lib/db/sessions";

type SessionDetailView = {
  id: string;
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

  const [roundsRaw, summaryRaw] = await Promise.all([getRoundsByGameSessionId(id), getSessionRoundSummary(id)]);
  const gameSession = gameSessionRaw as unknown as SessionDetailView;
  const rounds = roundsRaw as RoundView[];
  const summary = summaryRaw as SessionSummaryView;

  const canManageSession = canEditSession(user, sessionContext);

  const matchWinnerNameSet = new Set(
    summary.participants
      .filter((participant) => summary.matchWinnerSessionParticipantIds.includes(participant.sessionParticipantId))
      .map((participant) => participant.playerDisplayName),
  );

  return (
    <section className="space-y-6">
      <PageHeader
        title={gameSession.title ?? "Untitled session"}
        description="One session is one game night; rounds capture each short game in order."
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
                <AppButton href={`/dashboard/sessions/${gameSession.id}/rounds/new`} data-testid="session-add-round-link">
                  Add Round
                </AppButton>
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Played at" value={formatDateTime(gameSession.playedAt)} />
        <StatCard label="Participants" value={gameSession.participants.length} tone="accent" />
        <StatCard label="Trusted admins" value={gameSession.trustedAdmins.length} tone="warning" />
        <StatCard
          label="Winner"
          value={matchWinnerNameSet.size > 0 ? [...matchWinnerNameSet].join(", ") : "No winner yet"}
          tone={matchWinnerNameSet.size > 0 ? "success" : "default"}
        />
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
            <InfoRow label="Rounds played" value={summary.roundsPlayed} />
          </dl>

          <Divider className="my-5" />

          <h3 className="app-section-title text-base">Session summary</h3>
          {summary.participants.length > 0 ? (
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

      <SectionCard title="Rounds" className="space-y-3" data-testid="session-rounds-section">
        {rounds.length === 0 ? (
          <EmptyState title="No rounds yet" description="No rounds have been recorded for this session yet." />
        ) : (
          <ul className="space-y-2">
            {rounds.map((round) => (
              <li key={round.id} className="app-card-muted space-y-2 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">Round #{round.sequenceNumber}</span>
                    <StatusBadge>{round.placements.length} placements</StatusBadge>
                  </div>

                  {canManageSession ? (
                    <div className="flex items-center gap-2">
                      <Link className="app-button app-button-ghost" href={`/dashboard/sessions/${gameSession.id}/rounds/${round.id}/edit`}>
                        Edit
                      </Link>
                      <form action={deleteRoundAction.bind(null, gameSession.id, round.id, gameSession.groupId)}>
                        <button type="submit" className="app-button app-button-destructive">
                          Delete
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>

                <ol className="list-decimal space-y-1 pl-5 text-[var(--text-secondary)]">
                  {round.placements.map((placement) => (
                    <li key={placement.id}>
                      <Link className="underline" href={`/dashboard/players/${placement.sessionParticipant.player.id}`}>
                        {placement.sessionParticipant.player.displayName}
                      </Link>
                    </li>
                  ))}
                </ol>

                {round.notes ? <p className="text-[var(--text-muted)]">{round.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </section>
  );
}
