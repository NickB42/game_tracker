import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  playerId: string | null;
  mustChangePassword: boolean;
};

export const requireAuthenticatedUser = cache(async (): Promise<AuthenticatedUser> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
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

  if (!user) {
    redirect("/login");
  }

  return user;
});

export const isCurrentUserAdmin = cache(async (): Promise<boolean> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return user?.role === "ADMIN";
});

export async function requireAdminUser() {
  const user = await requireAuthenticatedUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return user;
}

export async function requireUserWithPendingPasswordChange() {
  const user = await requireAuthenticatedUser();

  if (!user.mustChangePassword) {
    redirect("/dashboard");
  }

  return user;
}