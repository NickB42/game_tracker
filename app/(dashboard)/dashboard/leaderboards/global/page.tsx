import Link from "next/link";

import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGlobalLeaderboard } from "@/lib/db/leaderboards";

export default async function GlobalLeaderboardPage() {
  await requireAuthenticatedUser();
  const rows = await getGlobalLeaderboard();

  return (
    <section className="space-y-6">
      <PageHeader
        title="Global leaderboard"
        description="Ratings replayed from all ranked round finishes, with derived round wins and session match wins."
        actions={
          <Link className="app-button app-button-secondary" href="/dashboard/leaderboards">
            Back to leaderboards
          </Link>
        }
      />

      <LeaderboardTable rows={rows} />
    </section>
  );
}
