import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionForm } from "@/components/sessions/session-form";
import { requireAdminUser } from "@/lib/auth/guards";
import { getGroups } from "@/lib/db/groups";
import { getPlayers } from "@/lib/db/players";
import { getGameSessionById } from "@/lib/db/sessions";

type EditGameSessionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditGameSessionPage({ params }: EditGameSessionPageProps) {
  await requireAdminUser();
  const { id } = await params;

  const [gameSession, groups, players] = await Promise.all([
    getGameSessionById(id),
    getGroups(),
    getPlayers({ includeInactive: true }),
  ]);

  if (!gameSession) {
    notFound();
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Edit game session</h1>
          <p className="mt-1 text-sm text-zinc-600">Update session details and synchronize attendance.</p>
        </div>
        <Link className="text-sm font-medium text-zinc-900 underline" href={`/dashboard/sessions/${gameSession.id}`}>
          Back to session
        </Link>
      </div>

      <SessionForm
        mode="edit"
        gameSessionId={gameSession.id}
        selectableGroups={groups.map((group) => ({ id: group.id, name: group.name }))}
        selectablePlayers={players.map((player) => ({
          id: player.id,
          displayName: player.displayName,
          isActive: player.isActive,
        }))}
        defaultValues={{
          groupId: gameSession.groupId,
          title: gameSession.title,
          playedAt: gameSession.playedAt.toISOString(),
          notes: gameSession.notes,
          participantIds: gameSession.participants.map((participant) => participant.playerId),
        }}
      />
    </section>
  );
}
