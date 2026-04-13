"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canCreateSession, canEditSession } from "@/lib/domain/authorization";
import { prisma } from "@/lib/db/prisma";
import {
  createGameSession,
  getGameSessionAuthorizationContext,
  setSessionParticipants,
  setSessionTrustedAdmins,
  updateGameSession,
} from "@/lib/db/sessions";
import { gameSessionInputSchema, gameSessionUpdateInputSchema } from "@/lib/validation/session";

export type SessionFormState = {
  message?: string;
  fieldErrors?: {
    groupId?: string;
    title?: string;
    playedAt?: string;
    notes?: string;
    participantIds?: string;
    trustedAdminUserIds?: string;
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

function parseTrustedAdminUserIdsFromFormData(formData: FormData): string[] {
  return formData
    .getAll("trustedAdminUserIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export async function createGameSessionAction(_prevState: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const user = await requireAuthenticatedUser();

  if (!canCreateSession(user)) {
    return {
      message: "You are not allowed to create sessions.",
    };
  }

  const parsed = gameSessionInputSchema.safeParse({
    groupId: parseOptionalString(formData, "groupId"),
    title: formData.get("title"),
    playedAt: formData.get("playedAt"),
    notes: formData.get("notes"),
    participantIds: parseParticipantIdsFromFormData(formData),
    trustedAdminUserIds: parseTrustedAdminUserIdsFromFormData(formData),
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
        trustedAdminUserIds: fieldErrors.trustedAdminUserIds?.[0],
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
          ownerUserId: user.id,
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
  const user = await requireAuthenticatedUser();
  const sessionContext = await getGameSessionAuthorizationContext(gameSessionId, user);

  if (!sessionContext || !canEditSession(user, sessionContext)) {
    return {
      message: "You are not allowed to edit this session.",
    };
  }

  const parsed = gameSessionUpdateInputSchema.safeParse({
    id: gameSessionId,
    groupId: parseOptionalString(formData, "groupId"),
    title: formData.get("title"),
    playedAt: formData.get("playedAt"),
    notes: formData.get("notes"),
    participantIds: parseParticipantIdsFromFormData(formData),
    trustedAdminUserIds: parseTrustedAdminUserIdsFromFormData(formData),
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
        trustedAdminUserIds: fieldErrors.trustedAdminUserIds?.[0],
      },
      message: "Please correct the highlighted fields.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updatedSession = await updateGameSession(parsed.data, tx);

      await setSessionTrustedAdmins(
        {
          gameSessionId: updatedSession.id,
          ownerUserId: updatedSession.ownerUserId,
          groupId: updatedSession.groupId,
          trustedAdminUserIds: parsed.data.trustedAdminUserIds,
        },
        tx,
      );

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
