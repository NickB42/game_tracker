import { redirect } from "next/navigation";

import { GroupForm } from "@/components/groups/group-form";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { AppButton, PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canCreateGroup } from "@/lib/domain/authorization";
import { getAllPlayers } from "@/lib/db/players";
import { getAssignableUsers } from "@/lib/db/users";

export default async function NewGroupPage() {
  const user = await requireAuthenticatedUser();

  if (!canCreateGroup(user)) {
    redirect("/dashboard/groups");
  }

  const [players, users] = await Promise.all([getAllPlayers({ includeInactive: true }), getAssignableUsers(user)]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Create group"
        actions={
          <AppButton href="/dashboard/groups" variant="secondary" className="app-icon-button">
            <ArrowLeftIcon />
            <span className="sr-only">Back to groups</span>
          </AppButton>
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
