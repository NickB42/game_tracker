import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditGroup } from "@/lib/domain/authorization";
import { getGroupById } from "@/lib/db/groups";

type GroupDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;
  const group = await getGroupById(id, user);

  if (!group) {
    notFound();
  }

  const canManageGroup = canEditGroup(user, {
    isOwner: group.ownerUserId === user.id,
    isTrustedAdmin: group.trustedAdmins.some((entry) => entry.userId === user.id),
    isMember: user.playerId ? group.memberships.some((membership) => membership.playerId === user.playerId) : false,
  });

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{group.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">Group details and current memberships.</p>
        </div>
        <div className="flex gap-3">
          <Link className="text-sm font-medium text-zinc-900 underline" href="/dashboard/groups">
            Back to groups
          </Link>
          <Link className="text-sm font-medium text-zinc-900 underline" href={`/dashboard/leaderboards/groups/${group.id}`}>
            Group leaderboard
          </Link>
          {canManageGroup ? (
            <Link className="text-sm font-medium text-zinc-900 underline" href={`/dashboard/groups/${group.id}/edit`}>
              Edit group
            </Link>
          ) : null}
        </div>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Description</h2>
        <p className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {group.description ?? "No description"}
        </p>
      </section>

      <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="font-medium text-zinc-700">Owner</dt>
          <dd className="text-zinc-900">{group.owner.name}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="font-medium text-zinc-700">Members</dt>
          <dd className="text-zinc-900">{group.memberships.length}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="font-medium text-zinc-700">Trusted admins</dt>
          <dd className="text-zinc-900">{group.trustedAdmins.length}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="font-medium text-zinc-700">Game sessions</dt>
          <dd className="text-zinc-900">{group._count.gameSessions}</dd>
        </div>
      </dl>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Trusted admins</h2>
        {group.trustedAdmins.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No trusted admins assigned.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {group.trustedAdmins.map((trustedAdmin) => (
              <li key={trustedAdmin.id} className="px-4 py-3 text-sm text-zinc-800">
                {trustedAdmin.user.name}
                <span className="ml-2 text-xs text-zinc-500">({trustedAdmin.user.email})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Members</h2>
        {group.memberships.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No players are currently assigned to this group.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {group.memberships.map((membership) => (
              <li key={membership.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <Link className="font-medium text-zinc-900 underline" href={`/dashboard/players/${membership.player.id}`}>
                  {membership.player.displayName}
                </Link>
                <span className="text-zinc-600">{membership.player.isActive ? "Active" : "Inactive"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
