"use server";

import { revalidatePath } from "next/cache";

import { changeOwnPassword, getApiErrorMessage } from "@/lib/auth/user-management";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { selfChangePasswordSchema } from "@/lib/validation/user-management";

export type SecurityFormState = {
  message?: string;
  success?: string;
  fieldErrors?: {
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
  };
};

export async function changeOwnPasswordAction(
  _prevState: SecurityFormState,
  formData: FormData,
): Promise<SecurityFormState> {
  const user = await requireAuthenticatedUser();

  const parsed = selfChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
    revokeOtherSessions: formData.get("revokeOtherSessions") === "on",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: {
        currentPassword: fieldErrors.currentPassword?.[0],
        newPassword: fieldErrors.newPassword?.[0],
        confirmNewPassword: fieldErrors.confirmNewPassword?.[0],
      },
    };
  }

  try {
    await changeOwnPassword(user.id, parsed.data);
  } catch (error) {
    return {
      message: getApiErrorMessage(error, "Unable to change password."),
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/force-password-change");

  return {
    success: "Password updated successfully.",
  };
}
