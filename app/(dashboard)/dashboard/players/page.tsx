import Link from "next/link";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getPlayers } from "@/lib/db/players";

export default async function PlayersPage() {
  const user = await requireAuthenticatedUser();
  const players = await getPlayers({ includeInactive: true });

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Players</h1>
          <p className="mt-1 text-sm text-zinc-600">Global player records used across all groups and future game sessions.</p>
        </div>
        {user.role === "ADMIN" ? (
          <Link
            href="/dashboard/players/new"
            data-testid="players-new-link"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            New player
          </Link>
        ) : null}
      </header>

      {players.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">No players created yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-medium">Display name</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Groups</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white text-zinc-800">
              {players.map((player) => (
                <tr key={player.id}>
                  <td className="px-4 py-3 font-medium">{player.displayName}</td>
                  <td className="px-4 py-3">{player.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{player._count.groupMemberships}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link className="text-zinc-900 underline" href={`/dashboard/players/${player.id}`}>
                        View
                      </Link>
                      {user.role === "ADMIN" ? (
                        <Link className="text-zinc-900 underline" href={`/dashboard/players/${player.id}/edit`}>
                          Edit
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}