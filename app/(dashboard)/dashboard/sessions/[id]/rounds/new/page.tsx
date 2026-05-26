import { notFound } from "next/navigation";

import { RoundForm } from "@/components/rounds/round-form";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { AppButton, EmptyState, PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditSession } from "@/lib/domain/authorization";
import { getGameSessionAuthorizationContext, getGameSessionById } from "@/lib/db/sessions";

type NewSessionRoundPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewSessionRoundPage({ params }: NewSessionRoundPageProps) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;

  const [gameSession, sessionContext] = await Promise.all([
    getGameSessionById(id, user),
    getGameSessionAuthorizationContext(id, user),
  ]);

  if (!gameSession || !sessionContext || !canEditSession(user, sessionContext)) {
    notFound();
  }

  if (gameSession.activityType !== "CARD") {
    notFound();
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Add round"
        actions={
          <AppButton href={`/dashboard/sessions/${gameSession.id}`} variant="ghost" className="app-icon-button">
            <ArrowLeftIcon />
            <span className="sr-only">Back to session</span>
          </AppButton>
        }
      />

      {gameSession.participants.length < 2 ? (
        <EmptyState
          title="Not enough participants"
          description="Add at least 2 participants before recording rounds."
        />
      ) : (
        <RoundForm
          mode="create"
          gameSessionId={gameSession.id}
          groupId={gameSession.groupId}
          participantOptions={gameSession.participants.map((participant) => ({
            sessionParticipantId: participant.id,
            playerDisplayName: participant.player.displayName,
            isActive: participant.player.isActive,
          }))}
        />
      )}
    </section>
  );
}
