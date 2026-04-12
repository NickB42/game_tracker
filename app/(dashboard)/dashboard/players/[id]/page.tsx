import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getPlayerById } from "@/lib/db/players";

type PlayerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PlayerDetailPage({ params }: PlayerDetailPageProps) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;

  const player = await getPlayerById(id);

  if (!player) {
    notFound();
  }

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900" data-testid="player-detail-heading">{player.displayName}</h1>
          <p className="mt-1 text-sm text-zinc-600">Player details and current group memberships.</p>
        </div>
        <div className="flex gap-3">
          <Link className="text-sm font-medium text-zinc-900 underline" href="/dashboard/players">
            Back to players
          </Link>
          {user.role === "ADMIN" ? (
            <Link className="text-sm font-medium text-zinc-900 underline" href={`/dashboard/players/${player.id}/edit`}>
              Edit player
            </Link>
          ) : null}
        </div>
      </header>

      <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="font-medium text-zinc-700">Active</dt>
          <dd className="text-zinc-900">{player.isActive ? "Yes" : "No"}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="font-medium text-zinc-700">Session participations</dt>
          <dd className="text-zinc-900">{player._count.sessionParticipants}</dd>
        </div>
      </dl>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Notes</h2>
        <p className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {player.notes ?? "No notes"}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Groups</h2>
        {player.groupMemberships.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">This player is not in any group yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {player.groupMemberships.map((membership) => (
              <li key={membership.id}>
                <Link className="text-sm text-zinc-900 underline" href={`/dashboard/groups/${membership.group.id}`}>
                  {membership.group.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
