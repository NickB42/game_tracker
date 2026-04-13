import Link from "next/link";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canCreateGroup, canEditGroup } from "@/lib/domain/authorization";
import { getGroups } from "@/lib/db/groups";

export default async function GroupsPage() {
  const user = await requireAuthenticatedUser();
  const groups = await getGroups(user);

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Groups</h1>
          <p className="mt-1 text-sm text-zinc-600">Named collections of players with explicit memberships.</p>
        </div>
        {canCreateGroup(user) ? (
          <Link
            href="/dashboard/groups/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            New group
          </Link>
        ) : null}
      </header>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">No groups created yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Members</th>
                <th className="px-4 py-3 font-medium">Game sessions</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white text-zinc-800">
              {groups.map((group) => (
                <tr key={group.id}>
                  <td className="px-4 py-3 font-medium">{group.name}</td>
                  <td className="px-4 py-3">{group._count.memberships}</td>
                  <td className="px-4 py-3">{group._count.gameSessions}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link className="text-zinc-900 underline" href={`/dashboard/groups/${group.id}`}>
                        View
                      </Link>
                      {canEditGroup(user, {
                        isOwner: group.ownerUserId === user.id,
                        isTrustedAdmin: group.trustedAdmins.length > 0,
                        isMember: false,
                      }) ? (
                        <Link className="text-zinc-900 underline" href={`/dashboard/groups/${group.id}/edit`}>
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
