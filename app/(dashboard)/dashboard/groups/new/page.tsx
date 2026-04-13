import Link from "next/link";
import { redirect } from "next/navigation";

import { GroupForm } from "@/components/groups/group-form";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canCreateGroup } from "@/lib/domain/authorization";
import { getPlayers } from "@/lib/db/players";
import { getAssignableUsers } from "@/lib/db/users";

export default async function NewGroupPage() {
  const user = await requireAuthenticatedUser();

  if (!canCreateGroup(user)) {
    redirect("/dashboard/groups");
  }

  const [players, users] = await Promise.all([getPlayers({ includeInactive: true }), getAssignableUsers()]);

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
