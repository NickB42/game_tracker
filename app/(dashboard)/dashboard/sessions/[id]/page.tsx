import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteRoundAction } from "@/actions/rounds";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditSession } from "@/lib/domain/authorization";
import { getRoundsByGameSessionId, getSessionRoundSummary } from "@/lib/db/rounds";
import { getGameSessionAuthorizationContext, getGameSessionById } from "@/lib/db/sessions";

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

  const [gameSession, sessionContext] = await Promise.all([
    getGameSessionById(id, user),
    getGameSessionAuthorizationContext(id, user),
  ]);

  if (!gameSession || !sessionContext) {
    notFound();
  }

  const [rounds, summary] = await Promise.all([getRoundsByGameSessionId(id), getSessionRoundSummary(id)]);

  const canManageSession = canEditSession(user, sessionContext);

  const matchWinnerNameSet = new Set(
    summary.participants
      .filter((participant) => summary.matchWinnerSessionParticipantIds.includes(participant.sessionParticipantId))
      .map((participant) => participant.playerDisplayName),
  );

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900" data-testid="session-detail-heading">
            {gameSession.title ?? "Untitled session"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">One session is one game night; rounds capture each short game in order.</p>
        </div>
        <div className="flex gap-3">
          <Link className="text-sm font-medium text-zinc-900 underline" href="/dashboard/sessions">
            Back to sessions
          </Link>
          <Link className="text-sm font-medium text-zinc-900 underline" href="/dashboard/leaderboards/global">
            Global leaderboard
          </Link>
          {canManageSession ? (
            <>
              <Link className="text-sm font-medium text-zinc-900 underline" href={`/dashboard/sessions/${gameSession.id}/edit`}>
                Edit session
              </Link>
              <Link
                className="text-sm font-medium text-zinc-900 underline"
                href={`/dashboard/sessions/${gameSession.id}/rounds/new`}
                data-testid="session-add-round-link"
              >
                Add round
              </Link>
            </>
          ) : null}
        </div>
      </header>

      <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="font-medium text-zinc-700">Played at</dt>
          <dd className="text-zinc-900">{formatDateTime(gameSession.playedAt)}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="font-medium text-zinc-700">Group</dt>
          <dd className="text-zinc-900">
            {gameSession.group ? (
              <Link className="underline" href={`/dashboard/groups/${gameSession.group.id}`}>
                {gameSession.group.name}
              </Link>
            ) : (
              "No group"
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="font-medium text-zinc-700">Owner</dt>
          <dd className="text-zinc-900">{gameSession.ownerUser.name}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="font-medium text-zinc-700">Created by</dt>
          <dd className="text-zinc-900">{gameSession.createdByUser?.name ?? "Unknown"}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="font-medium text-zinc-700">Trusted admins</dt>
          <dd className="text-zinc-900">{gameSession.trustedAdmins.length}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="font-medium text-zinc-700">Participants</dt>
          <dd className="text-zinc-900">{gameSession.participants.length}</dd>
        </div>
      </dl>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Trusted admins</h2>
        {gameSession.trustedAdmins.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No trusted admins assigned.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {gameSession.trustedAdmins.map((trustedAdmin) => (
              <li key={trustedAdmin.id} className="px-4 py-3 text-sm text-zinc-800">
                {trustedAdmin.user.name}
                <span className="ml-2 text-xs text-zinc-500">({trustedAdmin.user.email})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Session summary</h2>
        <dl className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <dt className="font-medium text-zinc-700">Rounds played</dt>
            <dd className="text-zinc-900">{summary.roundsPlayed}</dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <dt className="font-medium text-zinc-700">Derived match winner(s)</dt>
            <dd className="text-zinc-900">{matchWinnerNameSet.size > 0 ? [...matchWinnerNameSet].join(", ") : "No winner yet"}</dd>
          </div>
        </dl>

        {summary.participants.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Player</th>
                  <th className="px-4 py-3 font-medium">Round wins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white text-zinc-800">
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
                      <td className="px-4 py-3">
                        <Link className="underline" href={`/dashboard/players/${participant.playerId}`}>
                          {participant.playerDisplayName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{participant.roundWins}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Notes</h2>
        <p className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {gameSession.notes ?? "No notes"}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Participants</h2>
        {gameSession.participants.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No participants are currently assigned to this session.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {gameSession.participants.map((participant) => (
              <li key={participant.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <Link className="font-medium text-zinc-900 underline" href={`/dashboard/players/${participant.player.id}`}>
                  {participant.player.displayName}
                </Link>
                <span className="text-zinc-600">{participant.player.isActive ? "Active" : "Inactive"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="session-rounds-section">
        <h2 className="text-lg font-semibold text-zinc-900">Rounds</h2>
        {rounds.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No rounds have been recorded for this session yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {rounds.map((round) => (
              <li key={round.id} className="space-y-2 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-zinc-800">
                    <span className="font-medium">Round #{round.sequenceNumber}</span>
                    <span className="text-zinc-500">{round.placements.length} placements</span>
                  </div>

                  {canManageSession ? (
                    <div className="flex items-center gap-3">
                      <Link className="underline" href={`/dashboard/sessions/${gameSession.id}/rounds/${round.id}/edit`}>
                        Edit
                      </Link>
                      <form action={deleteRoundAction.bind(null, gameSession.id, round.id, gameSession.groupId)}>
                        <button type="submit" className="underline">
                          Delete
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>

                <ol className="list-decimal space-y-1 pl-5 text-zinc-700">
                  {round.placements.map((placement) => (
                    <li key={placement.id}>
                      <Link className="underline" href={`/dashboard/players/${placement.sessionParticipant.player.id}`}>
                        {placement.sessionParticipant.player.displayName}
                      </Link>
                    </li>
                  ))}
                </ol>

                {round.notes ? <p className="text-zinc-600">{round.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
