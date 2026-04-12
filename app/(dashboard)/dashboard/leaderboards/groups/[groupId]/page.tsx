import Link from "next/link";
import { notFound } from "next/navigation";

import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGroupLeaderboard } from "@/lib/db/leaderboards";
import { prisma } from "@/lib/db/prisma";

type GroupLeaderboardPageProps = {
  params: Promise<{
    groupId: string;
  }>;
};

export default async function GroupLeaderboardPage({ params }: GroupLeaderboardPageProps) {
  await requireAuthenticatedUser();

  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!group) {
    notFound();
  }

  const rows = await getGroupLeaderboard(group.id);

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Group leaderboard: {group.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Ratings and derived wins computed only from sessions historically linked to this group.
          </p>
        </div>
        <div className="flex gap-3">
          <Link className="text-sm font-medium text-zinc-900 underline" href="/dashboard/leaderboards">
            Back to leaderboards
          </Link>
          <Link className="text-sm font-medium text-zinc-900 underline" href={`/dashboard/groups/${group.id}`}>
            Open group
          </Link>
        </div>
      </header>

      <LeaderboardTable rows={rows} />
    </section>
  );
}
