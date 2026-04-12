import Link from "next/link";

import { UserCreateForm } from "@/components/admin/users/user-create-form";
import { requireAdminUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export default async function NewManagedUserPage() {
  await requireAdminUser();

  const players = await prisma.player.findMany({
    orderBy: {
      displayName: "asc",
    },
    select: {
      id: true,
      displayName: true,
    },
  });

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Create user</h1>
          <p className="mt-1 text-sm text-zinc-600">Create an invited account with a temporary password.</p>
        </div>
        <Link className="text-sm font-medium text-zinc-900 underline" href="/dashboard/admin/users">
          Back to users
        </Link>
      </div>

      <UserCreateForm players={players} />
    </section>
  );
}
