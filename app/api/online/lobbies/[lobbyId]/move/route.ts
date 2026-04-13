import { NextResponse } from "next/server";

import { requireApiAuthenticatedUser } from "@/lib/auth/api-guards";
import { applyOnlineMove } from "@/lib/db/online";
import { onlineMoveSchema } from "@/lib/validation/online";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ lobbyId: string }> }) {
  const user = await requireApiAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { lobbyId } = await context.params;
  const body = await request.json();

  const parsed = onlineMoveSchema.safeParse({
    lobbyId,
    move: body?.move,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.flatten().formErrors[0] ?? "Invalid move payload.",
      },
      { status: 400 },
    );
  }

  try {
    const resolution = await applyOnlineMove(user.id, lobbyId, parsed.data.move);
    return NextResponse.json({
      ok: true,
      events: resolution.events,
      burned: resolution.burned,
      pickedUp: resolution.pickedUp,
      nextTurnSeatIndex: resolution.nextTurnSeatIndex,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    throw error;
  }
}
