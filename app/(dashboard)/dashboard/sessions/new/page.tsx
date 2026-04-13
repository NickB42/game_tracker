import Link from "next/link";
import { redirect } from "next/navigation";

import { SessionForm } from "@/components/sessions/session-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canCreateSession } from "@/lib/domain/authorization";
import { getGroups } from "@/lib/db/groups";
import { getPlayers } from "@/lib/db/players";
import { getAssignableUsers } from "@/lib/db/users";

export default async function NewSessionPage() {
  const user = await requireAuthenticatedUser();

  if (!canCreateSession(user)) {
    redirect("/dashboard/sessions");
  }

  const [groups, players, users] = await Promise.all([
    getGroups(user),
    getPlayers({ includeInactive: true }),
    getAssignableUsers(user),
  ]);

  return (
    <section className="space-y-5">
      <PageHeader
        title="Create Game Session"
        description="Record when a session was played and who attended."
        actions={
          <Link className="app-button app-button-ghost" href="/dashboard/sessions">
            Back to sessions
          </Link>
        }
      />

      <SessionForm
        mode="create"
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
      />
    </section>
  );
}
