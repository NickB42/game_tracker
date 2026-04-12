import { headers } from "next/headers";
import { APIError } from "better-auth/api";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  SelfChangePasswordInput,
} from "@/lib/validation/user-management";

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  playerId: string | null;
  mustChangePassword: boolean;
  createdAt: Date;
  player: {
    id: string;
    displayName: string;
  } | null;
};

async function getAuthHeaders() {
  return await headers();
}

type CreateUserEndpoint = (input: {
  headers: Headers;
  body: {
    email: string;
    name: string;
    password?: string;
    role?: string;
    data?: Record<string, unknown>;
  };
}) => Promise<{ user: { id: string } }>;

type SetRoleEndpoint = (input: {
  headers: Headers;
  body: {
    userId: string;
    role: string;
  };
}) => Promise<unknown>;

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof APIError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

async function ensurePlayerExists(playerId: string) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      archivedAt: true,
    },
  });

  if (!player) {
    throw new Error("Selected player does not exist.");
  }

  if (player.archivedAt) {
    throw new Error("Archived players cannot be linked to a user.");
  }
}

async function ensurePlayerNotLinkedElsewhere(playerId: string, excludingUserId?: string) {
  const user = await prisma.user.findFirst({
    where: {
      playerId,
      ...(excludingUserId ? { id: { not: excludingUserId } } : undefined),
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (user) {
    throw new Error(`This player is already linked to ${user.email}.`);
  }
}

async function normalizePlayerLink(playerId: string | null | undefined, excludingUserId?: string) {
  if (!playerId) {
    return null;
  }

  await ensurePlayerExists(playerId);
  await ensurePlayerNotLinkedElsewhere(playerId, excludingUserId);

  return playerId;
}

async function getManagedUserRecord(id: string): Promise<ManagedUser> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      playerId: true,
      mustChangePassword: true,
      createdAt: true,
      player: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  return user;
}

export async function getUsers(): Promise<ManagedUser[]> {
  return prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      playerId: true,
      mustChangePassword: true,
      createdAt: true,
      player: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });
}

export async function getUserById(userId: string): Promise<ManagedUser> {
  return getManagedUserRecord(userId);
}

export async function createManagedUser(input: AdminCreateUserInput): Promise<ManagedUser> {
  const playerId = await normalizePlayerLink(input.playerId);
  const requestHeaders = await getAuthHeaders();
  const createUser = auth.api.createUser as unknown as CreateUserEndpoint;

  const created = await createUser({
    headers: requestHeaders,
    body: {
      email: input.email,
      name: input.name,
      password: input.temporaryPassword,
      role: input.role,
    },
  });

  await auth.api.adminUpdateUser({
    headers: requestHeaders,
    body: {
      userId: created.user.id,
      data: {
        playerId,
        mustChangePassword: input.mustChangePassword,
      },
    },
  });

  return getManagedUserRecord(created.user.id);
}

export async function setManagedUserRole(userId: string, role: "ADMIN" | "MEMBER") {
  const requestHeaders = await getAuthHeaders();
  const setRole = auth.api.setRole as unknown as SetRoleEndpoint;

  await setRole({
    headers: requestHeaders,
    body: {
      userId,
      role,
    },
  });
}

export async function linkUserToPlayer(userId: string, playerId: string) {
  const normalizedPlayerId = await normalizePlayerLink(playerId, userId);
  const requestHeaders = await getAuthHeaders();

  await auth.api.adminUpdateUser({
    headers: requestHeaders,
    body: {
      userId,
      data: {
        playerId: normalizedPlayerId,
      },
    },
  });
}

export async function unlinkUserFromPlayer(userId: string) {
  const requestHeaders = await getAuthHeaders();

  await auth.api.adminUpdateUser({
    headers: requestHeaders,
    body: {
      userId,
      data: {
        playerId: null,
      },
    },
  });
}

export async function updateManagedUser(input: AdminUpdateUserInput): Promise<ManagedUser> {
  const playerId = await normalizePlayerLink(input.playerId, input.userId);
  const requestHeaders = await getAuthHeaders();

  await setManagedUserRole(input.userId, input.role);

  await auth.api.adminUpdateUser({
    headers: requestHeaders,
    body: {
      userId: input.userId,
      data: {
        name: input.name,
        playerId,
        mustChangePassword: input.mustChangePassword,
      },
    },
  });

  return getManagedUserRecord(input.userId);
}

export async function revokeManagedUserSessions(userId: string) {
  const requestHeaders = await getAuthHeaders();

  await auth.api.revokeUserSessions({
    headers: requestHeaders,
    body: {
      userId,
    },
  });
}

export async function setManagedUserPassword(input: {
  userId: string;
  newPassword: string;
  mustChangePassword: boolean;
  revokeExistingSessions?: boolean;
}) {
  const requestHeaders = await getAuthHeaders();

  await auth.api.setUserPassword({
    headers: requestHeaders,
    body: {
      userId: input.userId,
      newPassword: input.newPassword,
    },
  });

  await auth.api.adminUpdateUser({
    headers: requestHeaders,
    body: {
      userId: input.userId,
      data: {
        mustChangePassword: input.mustChangePassword,
      },
    },
  });

  if (input.revokeExistingSessions) {
    await revokeManagedUserSessions(input.userId);
  }
}

export async function changeOwnPassword(userId: string, input: SelfChangePasswordInput) {
  const requestHeaders = await getAuthHeaders();

  await auth.api.changePassword({
    headers: requestHeaders,
    body: {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      revokeOtherSessions: input.revokeOtherSessions,
    },
  });

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      mustChangePassword: false,
    },
  });
}
