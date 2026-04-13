import { NextResponse } from "next/server";

import { requireApiAuthenticatedUser } from "@/lib/auth/api-guards";
import { sendOnlineLobbyChatMessage } from "@/lib/db/online";
import { onlineChatMessageSchema } from "@/lib/validation/online";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ lobbyId: string }> }) {
  const user = await requireApiAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { lobbyId } = await context.params;
  const body = await request.json();

  const parsed = onlineChatMessageSchema.safeParse({
    lobbyId,
    message: body?.message,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.flatten().formErrors[0] ?? "Invalid chat payload.",
      },
      { status: 400 },
    );
  }

  try {
    await sendOnlineLobbyChatMessage(user.id, lobbyId, parsed.data.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    throw error;
  }
}
