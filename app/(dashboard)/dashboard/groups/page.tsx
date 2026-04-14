import Link from "next/link";

import { ActivityBadge } from "@/components/sessions/activity-badge";
import { AppButton, DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canCreateGroup, canEditGroup } from "@/lib/domain/authorization";
import { getGroups } from "@/lib/db/groups";

export default async function GroupsPage() {
  const user = await requireAuthenticatedUser();
  const groups = await getGroups(user);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Groups"
        description="Named collections of players with explicit memberships and trusted admin controls."
        actions={canCreateGroup(user) ? <AppButton href="/dashboard/groups/new">New group</AppButton> : <StatusBadge>Read only</StatusBadge>}
      />

      {groups.length === 0 ? (
        <EmptyState
          title="No groups yet"
          description="Create a group to organize memberships, run sessions, and unlock group leaderboards."
          action={canCreateGroup(user) ? <AppButton href="/dashboard/groups/new">Create group</AppButton> : null}
        />
      ) : (
        <DataTable>
          <table className="app-table min-w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Activity</th>
                <th>Members</th>
                <th>Sessions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id}>
                  <td className="font-medium text-[var(--text-primary)]">{group.name}</td>
                  <td>
                    <ActivityBadge activityType={group.activityType} />
                  </td>
                  <td>{group._count.memberships}</td>
                  <td>{group._count.gameSessions}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Link className="app-button app-button-ghost" href={`/dashboard/groups/${group.id}`}>
                        View
                      </Link>
                      {canEditGroup(user, {
                        isOwner: group.ownerUserId === user.id,
                        isTrustedAdmin: group.trustedAdmins.length > 0,
                        isMember: false,
                      }) ? (
                        <Link className="app-button app-button-secondary" href={`/dashboard/groups/${group.id}/edit`}>
                          Edit
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}
    </section>
  );
}
