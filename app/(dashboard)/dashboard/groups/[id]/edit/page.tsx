import Link from "next/link";
import { notFound } from "next/navigation";

import { GroupForm } from "@/components/groups/group-form";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditGroup } from "@/lib/domain/authorization";
import { getGroupAuthorizationContext, getGroupById } from "@/lib/db/groups";
import { getPlayers } from "@/lib/db/players";
import { getAssignableUsers } from "@/lib/db/users";

type EditGroupPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditGroupPage({ params }: EditGroupPageProps) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;

  const [groupContext, group, players, users] = await Promise.all([
    getGroupAuthorizationContext(id, user),
    getGroupById(id, user),
    getPlayers({ includeInactive: true }),
    getAssignableUsers(user),
  ]);

  if (!group || !groupContext || !canEditGroup(user, groupContext)) {
    notFound();
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Edit group</h1>
          <p className="mt-1 text-sm text-zinc-600">Update group details and synchronize members.</p>
        </div>
        <Link className="text-sm font-medium text-zinc-900 underline" href={`/dashboard/groups/${group.id}`}>
          Back to group
        </Link>
      </div>

      <GroupForm
        mode="edit"
        groupId={group.id}
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
          name: group.name,
          description: group.description,
          memberPlayerIds: group.memberships.map((membership) => membership.playerId),
          trustedAdminUserIds: group.trustedAdmins.map((entry) => entry.userId),
        }}
      />
    </section>
  );
}
