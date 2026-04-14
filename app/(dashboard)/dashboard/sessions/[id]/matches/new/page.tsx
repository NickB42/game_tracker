import Link from "next/link";
import { notFound } from "next/navigation";

import { SportsMatchForm } from "@/components/sessions/sports-match-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditSession } from "@/lib/domain/authorization";
import { getGameSessionAuthorizationContext, getGameSessionById } from "@/lib/db/sessions";

type NewSportsMatchPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type SessionView = {
  id: string;
  activityType: "CARD" | "SQUASH" | "PADEL";
  participants: Array<{
    id: string;
    player: {
      displayName: string;
      isActive: boolean;
    };
  }>;
};

export default async function NewSportsMatchPage({ params }: NewSportsMatchPageProps) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;

  const [gameSessionRaw, sessionContext] = await Promise.all([
    getGameSessionById(id, user),
    getGameSessionAuthorizationContext(id, user),
  ]);

  if (!gameSessionRaw || !sessionContext || !canEditSession(user, sessionContext)) {
    notFound();
  }

  const gameSession = gameSessionRaw as unknown as SessionView;

  if (gameSession.activityType === "CARD") {
    notFound();
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title={gameSession.activityType === "SQUASH" ? "Add squash match" : "Add padel match"}
        description="Record one manual match result for this session."
        actions={
          <Link className="app-button app-button-ghost" href={`/dashboard/sessions/${gameSession.id}`}>
            Back to session
          </Link>
        }
      />

      <SportsMatchForm
        mode="create"
        gameSessionId={gameSession.id}
        activityType={gameSession.activityType}
        participantOptions={gameSession.participants.map((participant) => ({
          sessionParticipantId: participant.id,
          playerDisplayName: participant.player.displayName,
          isActive: participant.player.isActive,
        }))}
      />
    </section>
  );
}
