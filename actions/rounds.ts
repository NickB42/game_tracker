"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditSession } from "@/lib/domain/authorization";
import { prisma } from "@/lib/db/prisma";
import { createRound, deleteRound, updateRound } from "@/lib/db/rounds";
import { getGameSessionAuthorizationContext } from "@/lib/db/sessions";
import { roundCreateInputSchema, roundDeleteInputSchema, roundUpdateInputSchema } from "@/lib/validation/round";

export type RoundFormState = {
  message?: string;
  fieldErrors?: {
    orderedSessionParticipantIds?: string;
    notes?: string;
  };
};

function parseOptionalString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOrderedSessionParticipantIds(formData: FormData): string[] {
  return formData
    .getAll("orderedSessionParticipantIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function revalidateLeaderboardPaths(groupId?: string | null) {
  revalidatePath("/dashboard/leaderboards");
  revalidatePath("/dashboard/leaderboards/global");

  if (groupId) {
    revalidatePath(`/dashboard/leaderboards/groups/${groupId}`);
  }
}

export async function createRoundAction(
  gameSessionId: string,
  groupId: string | null,
  _prevState: RoundFormState,
  formData: FormData,
): Promise<RoundFormState> {
  const user = await requireAuthenticatedUser();
  const sessionContext = await getGameSessionAuthorizationContext(gameSessionId, user);

  if (!sessionContext || !canEditSession(user, sessionContext)) {
    return {
      message: "You are not allowed to edit rounds in this session.",
    };
  }

  const parsed = roundCreateInputSchema.safeParse({
    gameSessionId,
    orderedSessionParticipantIds: parseOrderedSessionParticipantIds(formData),
    notes: parseOptionalString(formData, "notes"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      fieldErrors: {
        orderedSessionParticipantIds: fieldErrors.orderedSessionParticipantIds?.[0],
        notes: fieldErrors.notes?.[0],
      },
      message: "Please correct the highlighted fields.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await createRound(parsed.data, tx);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        message: "A conflicting round sequence was detected. Please submit again.",
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
  revalidateLeaderboardPaths(groupId);
  redirect(`/dashboard/sessions/${gameSessionId}`);
}

export async function updateRoundAction(
  gameSessionId: string,
  roundId: string,
  groupId: string | null,
  _prevState: RoundFormState,
  formData: FormData,
): Promise<RoundFormState> {
  const user = await requireAuthenticatedUser();
  const sessionContext = await getGameSessionAuthorizationContext(gameSessionId, user);

  if (!sessionContext || !canEditSession(user, sessionContext)) {
    return {
      message: "You are not allowed to edit rounds in this session.",
    };
  }

  const parsed = roundUpdateInputSchema.safeParse({
    id: roundId,
    gameSessionId,
    orderedSessionParticipantIds: parseOrderedSessionParticipantIds(formData),
    notes: parseOptionalString(formData, "notes"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      fieldErrors: {
        orderedSessionParticipantIds: fieldErrors.orderedSessionParticipantIds?.[0],
        notes: fieldErrors.notes?.[0],
      },
      message: "Please correct the highlighted fields.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await updateRound(parsed.data, tx);
    });
  } catch (error) {
    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    throw error;
  }

  revalidatePath("/dashboard/sessions");
  revalidatePath(`/dashboard/sessions/${gameSessionId}`);
  revalidateLeaderboardPaths(groupId);
  redirect(`/dashboard/sessions/${gameSessionId}`);
}

export async function deleteRoundAction(gameSessionId: string, roundId: string, groupId: string | null): Promise<void> {
  const user = await requireAuthenticatedUser();
  const sessionContext = await getGameSessionAuthorizationContext(gameSessionId, user);

  if (!sessionContext || !canEditSession(user, sessionContext)) {
    throw new Error("You are not allowed to edit rounds in this session.");
  }

  const parsed = roundDeleteInputSchema.parse({
    id: roundId,
    gameSessionId,
  });

  await prisma.$transaction(async (tx) => {
    await deleteRound(parsed, tx);
  });

  revalidatePath("/dashboard/sessions");
  revalidatePath(`/dashboard/sessions/${gameSessionId}`);
  revalidateLeaderboardPaths(groupId);
}
