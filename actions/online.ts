"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import {
  beginActiveTurns,
  closeOnlineLobby,
  createOnlineLobby,
  exportFinishedOnlineGameToTracker,
  joinOnlineLobbyByCode,
  leaveOnlineLobby,
  setOnlineLobbyReadyState,
  startOnlineLobbyGame,
  submitOnlineSwap,
} from "@/lib/db/online";
import { joinLobbySchema } from "@/lib/validation/online";

export type OnlineLobbyFormState = {
  message?: string;
  fieldErrors?: {
    code?: string;
  };
};

function parseString(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

export async function createOnlineLobbyAction(): Promise<void> {
  const user = await requireAuthenticatedUser();

  const lobby = await createOnlineLobby(user.id);

  revalidatePath("/dashboard/online-play");
  redirect(`/dashboard/online-play/${lobby.id}`);
}

export async function joinOnlineLobbyAction(
  _prevState: OnlineLobbyFormState,
  formData: FormData,
): Promise<OnlineLobbyFormState> {
  const user = await requireAuthenticatedUser();

  const parsed = joinLobbySchema.safeParse({
    code: parseString(formData, "code"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        code: fieldErrors.code?.[0],
      },
      message: "Enter a valid lobby code.",
    };
  }

  try {
    const lobby = await joinOnlineLobbyByCode(user.id, parsed.data.code);
    revalidatePath("/dashboard/online-play");
    redirect(`/dashboard/online-play/${lobby.id}`);
  } catch (error) {
    if (error instanceof Error) {
      return { message: error.message };
    }

    throw error;
  }
}

export async function leaveOnlineLobbyAction(lobbyId: string): Promise<void> {
  const user = await requireAuthenticatedUser();
  await leaveOnlineLobby(user.id, lobbyId);
  revalidatePath("/dashboard/online-play");
  redirect("/dashboard/online-play");
}

export async function setOnlineLobbyReadyAction(lobbyId: string, ready: boolean): Promise<void> {
  const user = await requireAuthenticatedUser();
  await setOnlineLobbyReadyState(user.id, lobbyId, ready);
  revalidatePath(`/dashboard/online-play/${lobbyId}`);
}

export async function startOnlineLobbyGameAction(lobbyId: string): Promise<void> {
  const user = await requireAuthenticatedUser();
  await startOnlineLobbyGame(user.id, lobbyId);
  revalidatePath(`/dashboard/online-play/${lobbyId}`);
}

export async function beginOnlineTurnsAction(lobbyId: string): Promise<void> {
  const user = await requireAuthenticatedUser();
  await beginActiveTurns(user.id, lobbyId);
  revalidatePath(`/dashboard/online-play/${lobbyId}`);
}

export async function submitOnlineSwapAction(
  lobbyId: string,
  _prevState: OnlineLobbyFormState,
  formData: FormData,
): Promise<OnlineLobbyFormState> {
  const user = await requireAuthenticatedUser();

  const handCardIds = formData
    .getAll("handCardIds")
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const faceUpCardIds = formData
    .getAll("faceUpCardIds")
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  try {
    await submitOnlineSwap(user.id, lobbyId, handCardIds, faceUpCardIds);
  } catch (error) {
    if (error instanceof Error) {
      return { message: error.message };
    }

    throw error;
  }

  revalidatePath(`/dashboard/online-play/${lobbyId}`);
  return { message: "Swap saved." };
}

export async function closeOnlineLobbyAction(lobbyId: string): Promise<void> {
  const user = await requireAuthenticatedUser();
  await closeOnlineLobby(user.id, lobbyId);
  revalidatePath("/dashboard/online-play");
  redirect("/dashboard/online-play");
}

export async function exportOnlineGameAction(lobbyId: string): Promise<void> {
  const user = await requireAuthenticatedUser();
  const gameSessionId = await exportFinishedOnlineGameToTracker(user.id, lobbyId);
  revalidatePath("/dashboard/sessions");
  redirect(`/dashboard/sessions/${gameSessionId}`);
}
