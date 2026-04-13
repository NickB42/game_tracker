import { NextResponse } from "next/server";

import { requireApiAuthenticatedUser } from "@/lib/auth/api-guards";
import { getOnlineLobbySnapshot } from "@/lib/db/online";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ lobbyId: string }> }) {
  const user = await requireApiAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { lobbyId } = await context.params;

  const membership = await prisma.onlineLobbyPlayer.findUnique({
    where: {
      lobbyId_userId: {
        lobbyId,
        userId: user.id,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const snapshot = await getOnlineLobbySnapshot(lobbyId, user.id);
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    throw error;
  }
}
