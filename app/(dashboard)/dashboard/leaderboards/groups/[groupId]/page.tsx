import Link from "next/link";
import { notFound } from "next/navigation";

import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGroupLeaderboard } from "@/lib/db/leaderboards";
import { getGroupById } from "@/lib/db/groups";

type GroupLeaderboardPageProps = {
  params: Promise<{
    groupId: string;
  }>;
};

export default async function GroupLeaderboardPage({ params }: GroupLeaderboardPageProps) {
  const user = await requireAuthenticatedUser();

  const { groupId } = await params;

  const group = await getGroupById(groupId, user);

  if (!group) {
    notFound();
  }

  const rows = await getGroupLeaderboard(group.id, user);

  if (!rows) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={`Group leaderboard: ${group.name}`}
        description="Ratings and derived wins computed only from sessions historically linked to this group."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="app-button app-button-secondary" href="/dashboard/leaderboards">
              Back to leaderboards
            </Link>
            <Link className="app-button app-button-ghost" href={`/dashboard/groups/${group.id}`}>
              Open group
            </Link>
          </div>
        }
      />

      <LeaderboardTable rows={rows} />
    </section>
  );
}
