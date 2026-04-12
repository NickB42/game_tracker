import Link from "next/link";

import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGlobalLeaderboard } from "@/lib/db/leaderboards";

export default async function GlobalLeaderboardPage() {
  await requireAuthenticatedUser();
  const rows = await getGlobalLeaderboard();

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900" data-testid="global-leaderboard-heading">Global leaderboard</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Ratings replayed from all ranked round finishes, with derived round wins and session match wins.
          </p>
        </div>
        <Link className="text-sm font-medium text-zinc-900 underline" href="/dashboard/leaderboards">
          Back to leaderboards
        </Link>
      </header>

      <LeaderboardTable rows={rows} />
    </section>
  );
}
