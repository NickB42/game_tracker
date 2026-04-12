import Link from "next/link";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGroups } from "@/lib/db/groups";

export default async function LeaderboardsIndexPage() {
  await requireAuthenticatedUser();
  const groups = await getGroups();

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900">Leaderboards</h1>
        <p className="text-sm text-zinc-600">
          View OpenSkill ratings replayed from round history, plus derived round wins and session match wins.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/leaderboards/global"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Open global leaderboard
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Group leaderboards</h2>
        {groups.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">No groups created yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {groups.map((group) => (
              <li key={group.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-zinc-900">{group.name}</span>
                <Link className="underline" href={`/dashboard/leaderboards/groups/${group.id}`}>
                  Open leaderboard
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
