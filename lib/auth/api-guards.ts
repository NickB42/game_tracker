import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function requireApiAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      playerId: true,
      mustChangePassword: true,
    },
  });

  return user;
}
