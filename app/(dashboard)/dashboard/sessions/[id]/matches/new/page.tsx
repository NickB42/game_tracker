import Link from "next/link";
import { notFound } from "next/navigation";

import { SportsMatchForm } from "@/components/sessions/sports-match-form";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditSession } from "@/lib/domain/authorization";
import { getSportsMatchesByGameSessionId } from "@/lib/db/matches";
import { getGameSessionAuthorizationContext, getGameSessionById } from "@/lib/db/sessions";

type NewSportsMatchPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    saved?: string;
  }>;
};

type SessionView = {
  id: string;
  activityType: "CARD" | "SQUASH" | "PADEL";
  participants: Array<{
    id: string;
    player: {
      id: string;
      displayName: string;
      isActive: boolean;
    };
  }>;
};

export default async function NewSportsMatchPage({ params, searchParams }: NewSportsMatchPageProps) {
  const user = await requireAuthenticatedUser();
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);

  const [gameSessionRaw, sessionContext, sportsMatchesRaw] = await Promise.all([
    getGameSessionById(id, user),
    getGameSessionAuthorizationContext(id, user),
    getSportsMatchesByGameSessionId(id),
  ]);

  if (!gameSessionRaw || !sessionContext || !canEditSession(user, sessionContext)) {
    notFound();
  }

  const gameSession = gameSessionRaw as unknown as SessionView;

  if (gameSession.activityType === "CARD") {
    notFound();
  }

  const latestMatch = sportsMatchesRaw.length > 0 ? sportsMatchesRaw[sportsMatchesRaw.length - 1] : null;
  const sessionParticipantIdByPlayerId = new Map(gameSession.participants.map((participant) => [participant.player.id, participant.id]));

  const defaultValues = latestMatch
    ? {
        sideOneSessionParticipantIds: latestMatch.participants
          .filter((participant) => participant.sideNumber === 1)
          .map((participant) => sessionParticipantIdByPlayerId.get(participant.player.id))
          .filter((value): value is string => Boolean(value)),
        sideTwoSessionParticipantIds: latestMatch.participants
          .filter((participant) => participant.sideNumber === 2)
          .map((participant) => sessionParticipantIdByPlayerId.get(participant.player.id))
          .filter((value): value is string => Boolean(value)),
      }
    : undefined;

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

      {saved === "1" ? (
        <div className="app-card-muted flex items-center justify-between gap-3 px-4 py-3 text-sm" data-testid="sports-match-saved-banner">
          <span>Match saved. Keep entering the next result.</span>
          <StatusBadge tone="success">Saved</StatusBadge>
        </div>
      ) : null}

      <SportsMatchForm
        mode="create"
        gameSessionId={gameSession.id}
        activityType={gameSession.activityType}
        defaultValues={defaultValues}
        participantOptions={gameSession.participants.map((participant) => ({
          sessionParticipantId: participant.id,
          playerDisplayName: participant.player.displayName,
          isActive: participant.player.isActive,
        }))}
      />
    </section>
  );
}
