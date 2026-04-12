"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { isCurrentUserAdmin } from "@/lib/auth/guards";
import { createPlayer, updatePlayer } from "@/lib/db/players";
import { playerInputSchema, playerUpdateInputSchema } from "@/lib/validation/player";

export type PlayerFormState = {
  message?: string;
  fieldErrors?: {
    displayName?: string;
    notes?: string;
  };
};

export async function createPlayerAction(_prevState: PlayerFormState, formData: FormData): Promise<PlayerFormState> {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    return {
      message: "Only admins can create players.",
    };
  }

  const parsed = playerInputSchema.safeParse({
    displayName: formData.get("displayName"),
    notes: formData.get("notes"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      fieldErrors: {
        displayName: fieldErrors.displayName?.[0],
        notes: fieldErrors.notes?.[0],
      },
      message: "Please correct the highlighted fields.",
    };
  }

  const player = await createPlayer(parsed.data);

  revalidatePath("/dashboard/players");
  redirect(`/dashboard/players/${player.id}`);
}

export async function updatePlayerAction(
  playerId: string,
  _prevState: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    return {
      message: "Only admins can edit players.",
    };
  }

  const parsed = playerUpdateInputSchema.safeParse({
    id: playerId,
    displayName: formData.get("displayName"),
    notes: formData.get("notes"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      fieldErrors: {
        displayName: fieldErrors.displayName?.[0],
        notes: fieldErrors.notes?.[0],
      },
      message: "Please correct the highlighted fields.",
    };
  }

  try {
    const player = await updatePlayer(parsed.data);

    revalidatePath("/dashboard/players");
    revalidatePath(`/dashboard/players/${player.id}`);
    redirect(`/dashboard/players/${player.id}`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return {
        message: "Player not found.",
      };
    }

    throw error;
  }
}