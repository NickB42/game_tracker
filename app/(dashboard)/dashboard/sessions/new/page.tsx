import Link from "next/link";

import { SessionForm } from "@/components/sessions/session-form";
import { requireAdminUser } from "@/lib/auth/guards";
import { getGroups } from "@/lib/db/groups";
import { getPlayers } from "@/lib/db/players";

export default async function NewSessionPage() {
  await requireAdminUser();

  const [groups, players] = await Promise.all([getGroups(), getPlayers({ includeInactive: true })]);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Create game session</h1>
          <p className="mt-1 text-sm text-zinc-600">Record when a session was played and who actually attended.</p>
        </div>
        <Link className="text-sm font-medium text-zinc-900 underline" href="/dashboard/sessions">
          Back to sessions
        </Link>
      </div>

      <SessionForm
        mode="create"
        selectableGroups={groups.map((group) => ({ id: group.id, name: group.name }))}
        selectablePlayers={players.map((player) => ({
          id: player.id,
          displayName: player.displayName,
          isActive: player.isActive,
        }))}
      />
    </section>
  );
}
