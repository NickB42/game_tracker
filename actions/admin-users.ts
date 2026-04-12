"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/auth/guards";
import {
  createManagedUser,
  getApiErrorMessage,
  revokeManagedUserSessions,
  setManagedUserPassword,
  updateManagedUser,
} from "@/lib/auth/user-management";
import {
  adminCreateUserSchema,
  adminResetPasswordSchema,
  adminUpdateUserSchema,
} from "@/lib/validation/user-management";

export type AdminUserFormState = {
  message?: string;
  success?: string;
  fieldErrors?: {
    email?: string;
    name?: string;
    role?: string;
    playerId?: string;
    temporaryPassword?: string;
    mustChangePassword?: string;
  };
};

export type AdminResetPasswordFormState = {
  message?: string;
  success?: string;
  fieldErrors?: {
    newPassword?: string;
    confirmNewPassword?: string;
  };
};

export async function createManagedUserAction(
  _prevState: AdminUserFormState,
  formData: FormData,
): Promise<AdminUserFormState> {
  await requireAdminUser();

  const parsed = adminCreateUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    playerId: formData.get("playerId"),
    temporaryPassword: formData.get("temporaryPassword"),
    mustChangePassword: formData.get("mustChangePassword") === "on",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: {
        email: fieldErrors.email?.[0],
        name: fieldErrors.name?.[0],
        role: fieldErrors.role?.[0],
        playerId: fieldErrors.playerId?.[0],
        temporaryPassword: fieldErrors.temporaryPassword?.[0],
        mustChangePassword: fieldErrors.mustChangePassword?.[0],
      },
    };
  }

  try {
    await createManagedUser(parsed.data);
  } catch (error) {
    return {
      message: getApiErrorMessage(error, "Unable to create user."),
    };
  }

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/users/new");
  redirect("/dashboard/admin/users");
}

export async function updateManagedUserAction(
  userId: string,
  _prevState: AdminUserFormState,
  formData: FormData,
): Promise<AdminUserFormState> {
  await requireAdminUser();

  const parsed = adminUpdateUserSchema.safeParse({
    userId,
    name: formData.get("name"),
    role: formData.get("role"),
    playerId: formData.get("playerId"),
    mustChangePassword: formData.get("mustChangePassword") === "on",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: {
        name: fieldErrors.name?.[0],
        role: fieldErrors.role?.[0],
        playerId: fieldErrors.playerId?.[0],
        mustChangePassword: fieldErrors.mustChangePassword?.[0],
      },
    };
  }

  try {
    await updateManagedUser(parsed.data);
  } catch (error) {
    return {
      message: getApiErrorMessage(error, "Unable to update user."),
    };
  }

  revalidatePath("/dashboard/admin/users");
  revalidatePath(`/dashboard/admin/users/${userId}`);

  return {
    success: "User details updated.",
  };
}

export async function resetManagedUserPasswordAction(
  userId: string,
  _prevState: AdminResetPasswordFormState,
  formData: FormData,
): Promise<AdminResetPasswordFormState> {
  await requireAdminUser();

  const parsed = adminResetPasswordSchema.safeParse({
    userId,
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
    revokeExistingSessions: formData.get("revokeExistingSessions") === "on",
    mustChangePassword: formData.get("mustChangePassword") === "on",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: {
        newPassword: fieldErrors.newPassword?.[0],
        confirmNewPassword: fieldErrors.confirmNewPassword?.[0],
      },
    };
  }

  try {
    await setManagedUserPassword({
      userId: parsed.data.userId,
      newPassword: parsed.data.newPassword,
      revokeExistingSessions: parsed.data.revokeExistingSessions,
      mustChangePassword: parsed.data.mustChangePassword,
    });
  } catch (error) {
    return {
      message: getApiErrorMessage(error, "Unable to reset user password."),
    };
  }

  revalidatePath("/dashboard/admin/users");
  revalidatePath(`/dashboard/admin/users/${userId}`);

  return {
    success: "Password updated successfully.",
  };
}

export async function revokeManagedUserSessionsAction(userId: string): Promise<AdminResetPasswordFormState> {
  await requireAdminUser();

  try {
    await revokeManagedUserSessions(userId);
  } catch (error) {
    return {
      message: getApiErrorMessage(error, "Unable to revoke user sessions."),
    };
  }

  return {
    success: "All sessions for this user were revoked.",
  };
}
