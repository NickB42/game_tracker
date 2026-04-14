import Link from "next/link";
import { redirect } from "next/navigation";

import { GroupForm } from "@/components/groups/group-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canCreateGroup } from "@/lib/domain/authorization";
import { getPlayers } from "@/lib/db/players";
import { getAssignableUsers } from "@/lib/db/users";

export default async function NewGroupPage() {
  const user = await requireAuthenticatedUser();

  if (!canCreateGroup(user)) {
    redirect("/dashboard/groups");
  }

  const [players, users] = await Promise.all([getPlayers({ includeInactive: true }), getAssignableUsers(user)]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Create group"
        description="Create a group and optionally assign existing players as members."
        actions={
          <Link className="app-button app-button-secondary" href="/dashboard/groups">
            Back to groups
          </Link>
        }
      />

      <GroupForm
        mode="create"
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
          activityType: "CARD",
        }}
      />
    </section>
  );
}
