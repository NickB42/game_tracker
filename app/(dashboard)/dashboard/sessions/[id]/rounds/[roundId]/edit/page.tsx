import Link from "next/link";
import { notFound } from "next/navigation";

import { RoundForm } from "@/components/rounds/round-form";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditSession } from "@/lib/domain/authorization";
import { getRoundById } from "@/lib/db/rounds";
import { getGameSessionAuthorizationContext, getGameSessionById } from "@/lib/db/sessions";

type EditRoundPageProps = {
  params: Promise<{
    id: string;
    roundId: string;
  }>;
};

export default async function EditRoundPage({ params }: EditRoundPageProps) {
  const user = await requireAuthenticatedUser();
  const { id, roundId } = await params;

  const [gameSession, sessionContext, round] = await Promise.all([
    getGameSessionById(id, user),
    getGameSessionAuthorizationContext(id, user),
    getRoundById(roundId),
  ]);

  if (!gameSession || !sessionContext || !canEditSession(user, sessionContext) || !round || round.gameSessionId !== gameSession.id) {
    notFound();
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Edit round #{round.sequenceNumber}</h1>
          <p className="mt-1 text-sm text-zinc-600">Adjust finishing order while keeping session-participant integrity.</p>
        </div>
        <Link className="text-sm font-medium text-zinc-900 underline" href={`/dashboard/sessions/${gameSession.id}`}>
          Back to session
        </Link>
      </div>

      <RoundForm
        mode="edit"
        gameSessionId={gameSession.id}
        roundId={round.id}
        groupId={gameSession.groupId}
        participantOptions={gameSession.participants.map((participant) => ({
          sessionParticipantId: participant.id,
          playerDisplayName: participant.player.displayName,
          isActive: participant.player.isActive,
        }))}
        defaultValues={{
          orderedSessionParticipantIds: round.placements.map((placement) => placement.sessionParticipantId),
          notes: round.notes,
        }}
      />
    </section>
  );
}
