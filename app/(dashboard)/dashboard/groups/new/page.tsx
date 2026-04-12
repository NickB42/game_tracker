import Link from "next/link";

import { GroupForm } from "@/components/groups/group-form";
import { requireAdminUser } from "@/lib/auth/guards";
import { getPlayers } from "@/lib/db/players";

export default async function NewGroupPage() {
  await requireAdminUser();
  const players = await getPlayers({ includeInactive: true });

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Create group</h1>
          <p className="mt-1 text-sm text-zinc-600">Create a group and optionally assign existing players as members.</p>
        </div>
        <Link className="text-sm font-medium text-zinc-900 underline" href="/dashboard/groups">
          Back to groups
        </Link>
      </div>

      <GroupForm
        mode="create"
        selectablePlayers={players.map((player) => ({
          id: player.id,
          displayName: player.displayName,
          isActive: player.isActive,
        }))}
      />
    </section>
  );
}
