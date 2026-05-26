import { notFound } from "next/navigation";

import { GroupForm } from "@/components/groups/group-form";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { AppButton, PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditGroup } from "@/lib/domain/authorization";
import { getGroupAuthorizationContext, getGroupById } from "@/lib/db/groups";
import { getAllPlayers } from "@/lib/db/players";
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
    getAllPlayers({ includeInactive: true }),
    getAssignableUsers(user),
  ]);

  if (!group || !groupContext || !canEditGroup(user, groupContext)) {
    notFound();
  }

  type GroupRecord = NonNullable<Awaited<ReturnType<typeof getGroupById>>>;
  const groupRecord: GroupRecord = group;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Edit group"
        actions={
          <AppButton href={`/dashboard/groups/${groupRecord.id}`} variant="secondary" className="app-icon-button">
            <ArrowLeftIcon />
            <span className="sr-only">Back to group</span>
          </AppButton>
        }
      />

      <GroupForm
        mode="edit"
        groupId={groupRecord.id}
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
          activityType: groupRecord.activityType,
          name: groupRecord.name,
          description: groupRecord.description,
          memberPlayerIds: groupRecord.memberships.map((membership) => membership.playerId),
          trustedAdminUserIds: groupRecord.trustedAdmins.map((entry) => entry.userId),
        }}
      />
    </section>
  );
}
