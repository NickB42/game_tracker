"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditSession } from "@/lib/domain/authorization";
import { createSportsMatch, deleteSportsMatch, updateSportsMatch } from "@/lib/db/matches";
import { prisma } from "@/lib/db/prisma";
import { getGameSessionAuthorizationContext } from "@/lib/db/sessions";
import {
  sportsMatchCreateInputSchema,
  sportsMatchDeleteInputSchema,
  sportsMatchUpdateInputSchema,
} from "@/lib/validation/match";

export type SportsMatchFormState = {
  message?: string;
  fieldErrors?: {
    sideOneSessionParticipantIds?: string;
    sideTwoSessionParticipantIds?: string;
    squashScoreSideOne?: string;
    padelSets?: string;
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

function parseOptionalInteger(formData: FormData, key: string): number | undefined {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return Number.NaN;
  }

  return parsed;
}

function parseSessionParticipantIds(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parsePadelSets(formData: FormData): Array<{ sideOneGames: number; sideTwoGames: number }> {
  const parsedSets: Array<{ sideOneGames: number; sideTwoGames: number }> = [];

  for (let i = 1; i <= 3; i += 1) {
    const sideOneGames = parseOptionalInteger(formData, `padelSet${i}SideOneGames`);
    const sideTwoGames = parseOptionalInteger(formData, `padelSet${i}SideTwoGames`);

    if (sideOneGames === undefined && sideTwoGames === undefined) {
      continue;
    }

    parsedSets.push({
      sideOneGames: sideOneGames ?? Number.NaN,
      sideTwoGames: sideTwoGames ?? Number.NaN,
    });
  }

  return parsedSets;
}

function revalidateSportsSessionPaths(gameSessionId: string) {
  revalidatePath("/dashboard/sessions");
  revalidatePath(`/dashboard/sessions/${gameSessionId}`);
}

export async function createSportsMatchAction(
  gameSessionId: string,
  activityType: "SQUASH" | "PADEL",
  _prevState: SportsMatchFormState,
  formData: FormData,
): Promise<SportsMatchFormState> {
  const user = await requireAuthenticatedUser();
  const sessionContext = await getGameSessionAuthorizationContext(gameSessionId, user);

  if (!sessionContext || !canEditSession(user, sessionContext)) {
    return {
      message: "You are not allowed to edit matches in this session.",
    };
  }

  const parsed = sportsMatchCreateInputSchema.safeParse({
    gameSessionId,
    activityType,
    sideOneSessionParticipantIds: parseSessionParticipantIds(formData, "sideOneSessionParticipantIds"),
    sideTwoSessionParticipantIds: parseSessionParticipantIds(formData, "sideTwoSessionParticipantIds"),
    squashScoreSideOne: parseOptionalInteger(formData, "squashScoreSideOne"),
    squashScoreSideTwo: parseOptionalInteger(formData, "squashScoreSideTwo"),
    padelSets: parsePadelSets(formData),
    notes: parseOptionalString(formData, "notes"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      fieldErrors: {
        sideOneSessionParticipantIds: fieldErrors.sideOneSessionParticipantIds?.[0],
        sideTwoSessionParticipantIds: fieldErrors.sideTwoSessionParticipantIds?.[0],
        squashScoreSideOne: fieldErrors.squashScoreSideOne?.[0] ?? fieldErrors.squashScoreSideTwo?.[0],
        padelSets: fieldErrors.padelSets?.[0],
        notes: fieldErrors.notes?.[0],
      },
      message: "Please correct the highlighted fields.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await createSportsMatch(parsed.data, tx);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        message: "A conflicting match sequence was detected. Please submit again.",
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    throw error;
  }

  revalidateSportsSessionPaths(gameSessionId);
  redirect(`/dashboard/sessions/${gameSessionId}`);
}

export async function updateSportsMatchAction(
  gameSessionId: string,
  matchId: string,
  activityType: "SQUASH" | "PADEL",
  _prevState: SportsMatchFormState,
  formData: FormData,
): Promise<SportsMatchFormState> {
  const user = await requireAuthenticatedUser();
  const sessionContext = await getGameSessionAuthorizationContext(gameSessionId, user);

  if (!sessionContext || !canEditSession(user, sessionContext)) {
    return {
      message: "You are not allowed to edit matches in this session.",
    };
  }

  const parsed = sportsMatchUpdateInputSchema.safeParse({
    id: matchId,
    gameSessionId,
    activityType,
    sideOneSessionParticipantIds: parseSessionParticipantIds(formData, "sideOneSessionParticipantIds"),
    sideTwoSessionParticipantIds: parseSessionParticipantIds(formData, "sideTwoSessionParticipantIds"),
    squashScoreSideOne: parseOptionalInteger(formData, "squashScoreSideOne"),
    squashScoreSideTwo: parseOptionalInteger(formData, "squashScoreSideTwo"),
    padelSets: parsePadelSets(formData),
    notes: parseOptionalString(formData, "notes"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      fieldErrors: {
        sideOneSessionParticipantIds: fieldErrors.sideOneSessionParticipantIds?.[0],
        sideTwoSessionParticipantIds: fieldErrors.sideTwoSessionParticipantIds?.[0],
        squashScoreSideOne: fieldErrors.squashScoreSideOne?.[0] ?? fieldErrors.squashScoreSideTwo?.[0],
        padelSets: fieldErrors.padelSets?.[0],
        notes: fieldErrors.notes?.[0],
      },
      message: "Please correct the highlighted fields.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await updateSportsMatch(parsed.data, tx);
    });
  } catch (error) {
    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    throw error;
  }

  revalidateSportsSessionPaths(gameSessionId);
  redirect(`/dashboard/sessions/${gameSessionId}`);
}

export async function deleteSportsMatchAction(gameSessionId: string, matchId: string): Promise<void> {
  const user = await requireAuthenticatedUser();
  const sessionContext = await getGameSessionAuthorizationContext(gameSessionId, user);

  if (!sessionContext || !canEditSession(user, sessionContext)) {
    throw new Error("You are not allowed to edit matches in this session.");
  }

  const parsed = sportsMatchDeleteInputSchema.parse({
    id: matchId,
    gameSessionId,
  });

  await prisma.$transaction(async (tx) => {
    await deleteSportsMatch(parsed, tx);
  });

  revalidateSportsSessionPaths(gameSessionId);
}
