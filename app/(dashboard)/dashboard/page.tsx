import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { auth } from "@/lib/auth/auth";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export default async function DashboardPage() {
  await requireAuthenticatedUser();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      role: true,
      playerId: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm" data-testid="dashboard-auth-shell">
      <h1 className="text-2xl font-semibold text-zinc-900" data-testid="dashboard-heading">Dashboard</h1>
      <p className="mt-2 text-sm text-zinc-600">Authenticated application shell.</p>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
          <dt className="font-medium text-zinc-700">Name</dt>
          <dd className="text-zinc-900">{user.name}</dd>
        </div>
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
          <dt className="font-medium text-zinc-700">Role</dt>
          <dd className="text-zinc-900">{user.role}</dd>
        </div>
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
          <dt className="font-medium text-zinc-700">Linked player</dt>
          <dd className="text-zinc-900">{user.playerId ? "Yes" : "No"}</dd>
        </div>
      </dl>

      <nav className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/dashboard/players"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Open players
        </Link>
        <Link
          href="/dashboard/groups"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Open groups
        </Link>
        <Link
          href="/dashboard/sessions"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Open sessions
        </Link>
        <Link
          href="/dashboard/leaderboards"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Open leaderboards
        </Link>
        <Link
          href="/dashboard/online-play"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Online play
        </Link>
        <Link
          href="/dashboard/settings/security"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Security settings
        </Link>
        {user.role === "ADMIN" ? (
          <Link
            href="/dashboard/admin/users"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            User management
          </Link>
        ) : null}
      </nav>

      <div className="mt-8">
        <LogoutButton />
      </div>
    </section>
  );
}
