import Link from "next/link";

import { requireAdminUser } from "@/lib/auth/guards";
import { getUsers } from "@/lib/auth/user-management";

export default async function AdminUsersPage() {
  await requireAdminUser();
  const users = await getUsers();

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900" data-testid="admin-users-heading">User management</h1>
          <p className="mt-1 text-sm text-zinc-600">Admin-only account management for this private invite-only app.</p>
        </div>
        <Link
          href="/dashboard/admin/users/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          New user
        </Link>
      </header>

      {users.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">No users found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200" data-testid="admin-users-table">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Linked player</th>
                <th className="px-4 py-3 font-medium">Must change password</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white text-zinc-800">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">{user.player?.displayName ?? "None"}</td>
                  <td className="px-4 py-3">{user.mustChangePassword ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <Link className="text-zinc-900 underline" href={`/dashboard/admin/users/${user.id}`}>
                      Manage
                    </Link>
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
