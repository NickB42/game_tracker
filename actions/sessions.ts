"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { requireAdminUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { createGameSession, setSessionParticipants, updateGameSession } from "@/lib/db/sessions";
import { gameSessionInputSchema, gameSessionUpdateInputSchema } from "@/lib/validation/session";

export type SessionFormState = {
  message?: string;
  fieldErrors?: {
    groupId?: string;
    title?: string;
    playedAt?: string;
    notes?: string;
    participantIds?: string;
  };
};

function parseParticipantIdsFromFormData(formData: FormData): string[] {
  return formData
    .getAll("participantIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseOptionalString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function createGameSessionAction(_prevState: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const user = await requireAdminUser();

  const parsed = gameSessionInputSchema.safeParse({
    groupId: parseOptionalString(formData, "groupId"),
    title: formData.get("title"),
    playedAt: formData.get("playedAt"),
    notes: formData.get("notes"),
    participantIds: parseParticipantIdsFromFormData(formData),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        groupId: fieldErrors.groupId?.[0],
        title: fieldErrors.title?.[0],
        playedAt: fieldErrors.playedAt?.[0],
        notes: fieldErrors.notes?.[0],
        participantIds: fieldErrors.participantIds?.[0],
      },
      message: "Please correct the highlighted fields.",
    };
  }

  let gameSessionId: string;

  try {
    const gameSession = await prisma.$transaction(async (tx) => {
      const created = await createGameSession(
        {
          ...parsed.data,
          createdByUserId: user.id,
        },
        tx,
      );

      await setSessionParticipants(
        {
          gameSessionId: created.id,
          participantIds: parsed.data.participantIds,
        },
        tx,
      );

      return created;
    });

    gameSessionId = gameSession.id;
  } catch (error) {
    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    throw error;
  }

  revalidatePath("/dashboard/sessions");
  redirect(`/dashboard/sessions/${gameSessionId}`);
}

export async function updateGameSessionAction(
  gameSessionId: string,
  _prevState: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireAdminUser();

  const parsed = gameSessionUpdateInputSchema.safeParse({
    id: gameSessionId,
    groupId: parseOptionalString(formData, "groupId"),
    title: formData.get("title"),
    playedAt: formData.get("playedAt"),
    notes: formData.get("notes"),
    participantIds: parseParticipantIdsFromFormData(formData),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        groupId: fieldErrors.groupId?.[0],
        title: fieldErrors.title?.[0],
        playedAt: fieldErrors.playedAt?.[0],
        notes: fieldErrors.notes?.[0],
        participantIds: fieldErrors.participantIds?.[0],
      },
      message: "Please correct the highlighted fields.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await updateGameSession(parsed.data, tx);
      await setSessionParticipants(
        {
          gameSessionId: parsed.data.id,
          participantIds: parsed.data.participantIds,
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return {
        message: "Session not found.",
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    throw error;
  }

  revalidatePath("/dashboard/sessions");
  revalidatePath(`/dashboard/sessions/${gameSessionId}`);
  redirect(`/dashboard/sessions/${gameSessionId}`);
}
