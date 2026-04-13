import Link from "next/link";

import { UserCreateForm } from "@/components/admin/users/user-create-form";
import { PageHeader } from "@/components/ui/primitives";
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
    <section className="space-y-6">
      <PageHeader
        title="Create user"
        description="Create an invited account with a temporary password."
        actions={
          <Link className="app-button app-button-secondary" href="/dashboard/admin/users">
            Back to users
          </Link>
        }
      />

      <UserCreateForm players={players} />
    </section>
  );
}
