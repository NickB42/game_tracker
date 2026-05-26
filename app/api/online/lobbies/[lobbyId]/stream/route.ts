import { requireApiAuthenticatedUser } from "@/lib/auth/api-guards";
import { getOnlineLobbySnapshot } from "@/lib/db/online";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function sseData(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request, context: { params: Promise<{ lobbyId: string }> }) {
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

  const signal = request.signal;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let iterations = 0;

      while (!signal.aborted && iterations < 15) {
        try {
          const snapshot = await getOnlineLobbySnapshot(lobbyId, user.id);
          if (signal.aborted) break;
          controller.enqueue(encoder.encode(sseData("snapshot", snapshot)));
        } catch (error) {
          if (signal.aborted) break;
          const message = error instanceof Error ? error.message : "Failed to stream snapshot";
          controller.enqueue(encoder.encode(sseData("error", { message })));
        }

        iterations += 1;

        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 2_000);
          signal.addEventListener("abort", () => { clearTimeout(timer); resolve(undefined); }, { once: true });
        });
      }

      if (!signal.aborted) {
        controller.close();
      }
    },
    cancel() {
      // Client disconnected — loop will exit via signal.aborted check
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
