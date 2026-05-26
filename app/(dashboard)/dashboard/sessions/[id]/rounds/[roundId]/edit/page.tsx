import { notFound } from "next/navigation";

import { RoundForm } from "@/components/rounds/round-form";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { AppButton, PageHeader } from "@/components/ui/primitives";
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

  if (gameSession.activityType !== "CARD") {
    notFound();
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title={`Edit round #${round.sequenceNumber}`}
        actions={
          <AppButton href={`/dashboard/sessions/${gameSession.id}`} variant="ghost" className="app-icon-button">
            <ArrowLeftIcon />
            <span className="sr-only">Back to session</span>
          </AppButton>
        }
      />

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
