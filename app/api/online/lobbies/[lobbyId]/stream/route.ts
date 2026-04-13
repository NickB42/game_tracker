import { requireApiAuthenticatedUser } from "@/lib/auth/api-guards";
import { getOnlineLobbySnapshot } from "@/lib/db/online";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function sseData(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(_request: Request, context: { params: Promise<{ lobbyId: string }> }) {
  const user = await requireApiAuthenticatedUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
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
    return new Response("Forbidden", { status: 403 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const encoder = new TextEncoder();
      let iterations = 0;

      while (!closed && iterations < 15) {
        try {
          const snapshot = await getOnlineLobbySnapshot(lobbyId, user.id);
          controller.enqueue(encoder.encode(sseData("snapshot", snapshot)));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to stream snapshot";
          controller.enqueue(encoder.encode(sseData("error", { message })));
        }

        iterations += 1;

        await new Promise((resolve) => {
          setTimeout(resolve, 2_000);
        });
      }

      closed = true;
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
