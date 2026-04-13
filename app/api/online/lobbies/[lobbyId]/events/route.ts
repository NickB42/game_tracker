import { NextResponse } from "next/server";

import { requireApiAuthenticatedUser } from "@/lib/auth/api-guards";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ lobbyId: string }> }) {
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

  const search = new URL(request.url).searchParams;
  const since = search.get("since");
  const sinceDate = since ? new Date(since) : null;

  const events = await prisma.onlineGameEvent.findMany({
    where: {
      lobbyId,
      ...(sinceDate && !Number.isNaN(sinceDate.getTime())
        ? {
            createdAt: {
              gt: sinceDate,
            },
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      actorUserId: event.actorUserId,
      payload: event.payloadJson,
      createdAt: event.createdAt,
    })),
  });
}
