import Link from "next/link";
import { notFound } from "next/navigation";

import { UserEditForm } from "@/components/admin/users/user-edit-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireAdminUser } from "@/lib/auth/guards";
import { getApiErrorMessage, getUserById } from "@/lib/auth/user-management";
import { prisma } from "@/lib/db/prisma";

type AdminUserDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  await requireAdminUser();
  const { id } = await params;

  let user;

  try {
    user = await getUserById(id);
  } catch (error) {
    const message = getApiErrorMessage(error, "User not found.");

    if (message === "User not found.") {
      notFound();
    }

    throw error;
  }

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
        title="Manage user"
        description="Update role, linked player, must-change policy, and temporary password."
        actions={
          <Link className="app-button app-button-secondary" href="/dashboard/admin/users">
            Back to users
          </Link>
        }
      />

      <UserEditForm
        user={{
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          playerId: user.playerId,
          mustChangePassword: user.mustChangePassword,
        }}
        players={players}
      />
    </section>
  );
}
