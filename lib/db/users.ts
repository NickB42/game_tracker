import { prisma } from "@/lib/db/prisma";

export async function getAssignableUsers() {
  return prisma.user.findMany({
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      playerId: true,
    },
  });
}
