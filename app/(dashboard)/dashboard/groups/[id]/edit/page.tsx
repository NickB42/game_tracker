import Link from "next/link";
import { notFound } from "next/navigation";

import { GroupForm } from "@/components/groups/group-form";
import { requireAdminUser } from "@/lib/auth/guards";
import { getGroupById } from "@/lib/db/groups";
import { getPlayers } from "@/lib/db/players";

type EditGroupPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditGroupPage({ params }: EditGroupPageProps) {
  await requireAdminUser();
  const { id } = await params;

  const [group, players] = await Promise.all([getGroupById(id), getPlayers({ includeInactive: true })]);

  if (!group) {
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
        selectablePlayers={players.map((player) => ({
          id: player.id,
          displayName: player.displayName,
          isActive: player.isActive,
        }))}
        defaultValues={{
          name: group.name,
          description: group.description,
          memberPlayerIds: group.memberships.map((membership) => membership.playerId),
        }}
      />
    </section>
  );
}
