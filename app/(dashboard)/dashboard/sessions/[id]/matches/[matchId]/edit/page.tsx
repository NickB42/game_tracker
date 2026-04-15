import Link from "next/link";
import { notFound } from "next/navigation";

import { SportsMatchForm } from "@/components/sessions/sports-match-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditSession } from "@/lib/domain/authorization";
import { getSportsMatchById } from "@/lib/db/matches";
import { getGameSessionAuthorizationContext, getGameSessionById } from "@/lib/db/sessions";

type EditSportsMatchPageProps = {
  params: Promise<{
    id: string;
    matchId: string;
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

type MatchView = {
  id: string;
  gameSessionId: string;
  participants: Array<{
    sideNumber: number | null;
    player: {
      id: string;
    };
  }>;
  result: {
    scoreLines: Array<{
      sequenceNumber: number;
      sideNumber: number;
      score: number;
    }>;
  } | null;
  notes: string | null;
};

function buildPadelSetDefaults(scoreLines: Array<{ sequenceNumber: number; sideNumber: number; score: number }>) {
  const sets = new Map<number, { sideOneGames?: number; sideTwoGames?: number }>();

  for (const line of scoreLines) {
    const entry = sets.get(line.sequenceNumber) ?? {};

    if (line.sideNumber === 1) {
      entry.sideOneGames = line.score;
    }

    if (line.sideNumber === 2) {
      entry.sideTwoGames = line.score;
    }

    sets.set(line.sequenceNumber, entry);
  }

  return [...sets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map((entry) => ({
      sideOneGames: entry[1].sideOneGames ?? 0,
      sideTwoGames: entry[1].sideTwoGames ?? 0,
    }));
}

export default async function EditSportsMatchPage({ params }: EditSportsMatchPageProps) {
  const user = await requireAuthenticatedUser();
  const { id, matchId } = await params;

  const [gameSessionRaw, sessionContext, matchRaw] = await Promise.all([
    getGameSessionById(id, user),
    getGameSessionAuthorizationContext(id, user),
    getSportsMatchById(matchId),
  ]);

  if (!gameSessionRaw || !sessionContext || !matchRaw || !canEditSession(user, sessionContext)) {
    notFound();
  }

  const gameSession = gameSessionRaw as unknown as SessionView;
  const match = matchRaw as unknown as MatchView;

  if (gameSession.activityType === "CARD" || match.gameSessionId !== gameSession.id) {
    notFound();
  }

  const sessionParticipantIdByPlayerId = new Map(gameSession.participants.map((participant) => [participant.player.id, participant.id]));
  const sideOneSessionParticipantIds = match.participants
    .filter((participant) => participant.sideNumber === 1)
    .map((participant) => sessionParticipantIdByPlayerId.get(participant.player.id))
    .filter((value): value is string => Boolean(value));

  const sideTwoSessionParticipantIds = match.participants
    .filter((participant) => participant.sideNumber === 2)
    .map((participant) => sessionParticipantIdByPlayerId.get(participant.player.id))
    .filter((value): value is string => Boolean(value));

  const sortedScoreLines = [...(match.result?.scoreLines ?? [])].sort((a, b) => {
    if (a.sequenceNumber !== b.sequenceNumber) {
      return a.sequenceNumber - b.sequenceNumber;
    }

    return a.sideNumber - b.sideNumber;
  });

  const squashScoreSideOne = sortedScoreLines.find((line) => line.sequenceNumber === 1 && line.sideNumber === 1)?.score;
  const squashScoreSideTwo = sortedScoreLines.find((line) => line.sequenceNumber === 1 && line.sideNumber === 2)?.score;

  return (
    <section className="space-y-5">
      <PageHeader
        title="Edit match"
        description="Adjust participants and score while preserving session ownership rules."
        actions={
          <Link className="app-button app-button-ghost" href={`/dashboard/sessions/${gameSession.id}`}>
            Back to session
          </Link>
        }
      />

      <SportsMatchForm
        mode="edit"
        gameSessionId={gameSession.id}
        matchId={match.id}
        activityType={gameSession.activityType}
        participantOptions={gameSession.participants.map((participant) => ({
          sessionParticipantId: participant.id,
          playerDisplayName: participant.player.displayName,
          isActive: participant.player.isActive,
        }))}
        defaultValues={{
          sideOneSessionParticipantIds,
          sideTwoSessionParticipantIds,
          squashScoreSideOne,
          squashScoreSideTwo,
          padelSets: buildPadelSetDefaults(match.result?.scoreLines ?? []),
          notes: match.notes,
        }}
      />
    </section>
  );
}
