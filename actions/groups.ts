"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canCreateGroup, canEditGroup } from "@/lib/domain/authorization";
import { createGroup, getGroupAuthorizationContext, setGroupMembers, setGroupTrustedAdmins, updateGroup } from "@/lib/db/groups";
import { prisma } from "@/lib/db/prisma";
import { groupInputSchema, groupWithMembersInputSchema } from "@/lib/validation/group";

export type GroupFormState = {
  message?: string;
  fieldErrors?: {
    activityType?: string;
    name?: string;
    description?: string;
    playerIds?: string;
    trustedAdminUserIds?: string;
  };
};

function parsePlayerIdsFromFormData(formData: FormData): string[] {
  return formData
    .getAll("playerIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseTrustedAdminUserIdsFromFormData(formData: FormData): string[] {
  return formData
    .getAll("trustedAdminUserIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export async function createGroupAction(_prevState: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const user = await requireAuthenticatedUser();

  if (!canCreateGroup(user)) {
    return {
      message: "You are not allowed to create groups.",
    };
  }

  const parsed = groupInputSchema.safeParse({
    activityType: formData.get("activityType"),
    name: formData.get("name"),
    description: formData.get("description"),
    trustedAdminUserIds: parseTrustedAdminUserIdsFromFormData(formData),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        activityType: fieldErrors.activityType?.[0],
        name: fieldErrors.name?.[0],
        description: fieldErrors.description?.[0],
        trustedAdminUserIds: fieldErrors.trustedAdminUserIds?.[0],
      },
      message: "Please correct the highlighted fields.",
    };
  }

  const playerIds = parsePlayerIdsFromFormData(formData);

  let groupId: string;

  try {
    const group = await prisma.$transaction(async (tx) => {
      const created = await createGroup(
        {
          ...parsed.data,
          ownerUserId: user.id,
        },
        tx,
      );

      await setGroupMembers(
        {
          groupId: created.id,
          playerIds,
        },
        tx,
      );

      return created;
    });

    groupId = group.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        fieldErrors: {
          name: "A group with this name already exists.",
        },
        message: "Please choose a different group name.",
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    throw error;
  }

  revalidatePath("/dashboard/groups");
  redirect(`/dashboard/groups/${groupId}`);
}

export async function updateGroupAction(
  groupId: string,
  _prevState: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const user = await requireAuthenticatedUser();
  const groupContext = await getGroupAuthorizationContext(groupId, user);

  if (!groupContext || !canEditGroup(user, groupContext)) {
    return {
      message: "You are not allowed to edit this group.",
    };
  }

  const parsed = groupWithMembersInputSchema.safeParse({
    id: groupId,
    activityType: formData.get("activityType"),
    name: formData.get("name"),
    description: formData.get("description"),
    playerIds: parsePlayerIdsFromFormData(formData),
    trustedAdminUserIds: parseTrustedAdminUserIdsFromFormData(formData),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        activityType: fieldErrors.activityType?.[0],
        name: fieldErrors.name?.[0],
        description: fieldErrors.description?.[0],
        playerIds: fieldErrors.playerIds?.[0],
        trustedAdminUserIds: fieldErrors.trustedAdminUserIds?.[0],
      },
      message: "Please correct the highlighted fields.",
    };
  }

  let groupIdFromUpdate: string;

  try {
    const group = await prisma.$transaction(async (tx) => {
      const updated = await updateGroup(parsed.data, tx);

      await setGroupTrustedAdmins(
        {
          groupId: updated.id,
          ownerUserId: updated.ownerUserId,
          trustedAdminUserIds: parsed.data.trustedAdminUserIds,
        },
        tx,
      );

      await setGroupMembers(
        {
          groupId: updated.id,
          playerIds: parsed.data.playerIds,
        },
        tx,
      );

      return updated;
    });

    groupIdFromUpdate = group.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        fieldErrors: {
          name: "A group with this name already exists.",
        },
        message: "Please choose a different group name.",
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return {
        message: "Group not found.",
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    throw error;
  }

  revalidatePath("/dashboard/groups");
  revalidatePath(`/dashboard/groups/${groupIdFromUpdate}`);
  redirect(`/dashboard/groups/${groupIdFromUpdate}`);
}