import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionForm } from "@/components/sessions/session-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditSession } from "@/lib/domain/authorization";
import { getGroups } from "@/lib/db/groups";
import { getPlayers } from "@/lib/db/players";
import { getGameSessionAuthorizationContext, getGameSessionById } from "@/lib/db/sessions";
import { getAssignableUsers } from "@/lib/db/users";

type SessionEditView = {
  id: string;
  activityType: "CARD" | "SQUASH" | "PADEL";
  groupId: string | null;
  title: string | null;
  playedAt: Date;
  notes: string | null;
  participants: Array<{ playerId: string }>;
  trustedAdmins: Array<{ userId: string }>;
};

type EditGameSessionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditGameSessionPage({ params }: EditGameSessionPageProps) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;

  const [gameSessionRaw, sessionContext, groups, players, users] = await Promise.all([
    getGameSessionById(id, user),
    getGameSessionAuthorizationContext(id, user),
    getGroups(user),
    getPlayers({ includeInactive: true }),
    getAssignableUsers(user),
  ]);

  if (!gameSessionRaw || !sessionContext || !canEditSession(user, sessionContext)) {
    notFound();
  }

  const gameSession = gameSessionRaw as unknown as SessionEditView;

  return (
    <section className="space-y-5">
      <PageHeader
        title="Edit Game Session"
        description="Update session details and synchronize attendance."
        actions={
          <Link className="app-button app-button-ghost" href={`/dashboard/sessions/${gameSession.id}`}>
            Back to session
          </Link>
        }
      />

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
          activityType: gameSession.activityType,
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
