import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionForm } from "@/components/sessions/session-form";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditSession } from "@/lib/domain/authorization";
import { getGroups } from "@/lib/db/groups";
import { getPlayers } from "@/lib/db/players";
import { getGameSessionAuthorizationContext, getGameSessionById } from "@/lib/db/sessions";
import { getAssignableUsers } from "@/lib/db/users";

type EditGameSessionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditGameSessionPage({ params }: EditGameSessionPageProps) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;

  const [gameSession, sessionContext, groups, players, users] = await Promise.all([
    getGameSessionById(id, user),
    getGameSessionAuthorizationContext(id, user),
    getGroups(user),
    getPlayers({ includeInactive: true }),
    getAssignableUsers(user),
  ]);

  if (!gameSession || !sessionContext || !canEditSession(user, sessionContext)) {
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
        selectableUsers={users.map((entry) => ({
          id: entry.id,
          name: entry.name,
          email: entry.email,
        }))}
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
          trustedAdminUserIds: gameSession.trustedAdmins.map((entry) => entry.userId),
        }}
      />
    </section>
  );
}
