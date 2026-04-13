import { prisma } from "@/lib/db/prisma";
import type { AuthorizationActor } from "@/lib/domain/authorization";

export async function getAssignableUsers(actor: AuthorizationActor) {
  const users = await prisma.user.findMany({
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (actor.role === "ADMIN") {
    return users;
  }

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: "",
  }));
}
