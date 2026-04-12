import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or less.");

const optionalPlayerIdSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z.string().min(1).nullable(),
);

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(80, "Name must be 80 characters or fewer.");

const roleSchema = z.enum(["ADMIN", "MEMBER"]);

export const adminCreateUserSchema = z.object({
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase().trim()),
  name: nameSchema,
  role: roleSchema,
  playerId: optionalPlayerIdSchema,
  temporaryPassword: passwordSchema,
  mustChangePassword: z.boolean().default(true),
});

export const adminUpdateUserSchema = z.object({
  userId: z.string().trim().min(1),
  name: nameSchema,
  role: roleSchema,
  playerId: optionalPlayerIdSchema,
  mustChangePassword: z.boolean(),
});

export const adminResetPasswordSchema = z
  .object({
    userId: z.string().trim().min(1),
    newPassword: passwordSchema,
    confirmNewPassword: passwordSchema,
    revokeExistingSessions: z.boolean().default(false),
    mustChangePassword: z.boolean().default(true),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "Password confirmation does not match.",
    path: ["confirmNewPassword"],
  });

export const selfChangePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required.")
      .max(128, "Current password must be 128 characters or less."),
    newPassword: passwordSchema,
    confirmNewPassword: passwordSchema,
    revokeOtherSessions: z.boolean().default(false),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "Password confirmation does not match.",
    path: ["confirmNewPassword"],
  });

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
export type SelfChangePasswordInput = z.infer<typeof selfChangePasswordSchema>;
