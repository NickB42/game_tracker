import Link from "next/link";

import { AppButton, DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { requireAdminUser } from "@/lib/auth/guards";
import { getUsers } from "@/lib/auth/user-management";

export default async function AdminUsersPage() {
  await requireAdminUser();
  const users = await getUsers();

  return (
    <section className="space-y-6">
      <PageHeader
        title="User management"
        description="Admin-only account management for this private invite-only app."
        actions={<AppButton href="/dashboard/admin/users/new">New user</AppButton>}
      />

      {users.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Create the first managed account to invite members into the tracker."
          action={<AppButton href="/dashboard/admin/users/new">Create user</AppButton>}
        />
      ) : (
        <DataTable>
          <table className="app-table min-w-full" data-testid="admin-users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Linked player</th>
                <th>Password policy</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="whitespace-nowrap">{user.email}</td>
                  <td className="font-medium text-[var(--text-primary)]">{user.name}</td>
                  <td>
                    <StatusBadge tone={user.role === "ADMIN" ? "accent" : "neutral"}>{user.role}</StatusBadge>
                  </td>
                  <td>{user.player?.displayName ?? "None"}</td>
                  <td>
                    <StatusBadge tone={user.mustChangePassword ? "warning" : "success"}>
                      {user.mustChangePassword ? "Change required" : "Normal"}
                    </StatusBadge>
                  </td>
                  <td>
                    <Link className="app-button app-button-secondary" href={`/dashboard/admin/users/${user.id}`}>
                      Manage
                    </Link>
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
