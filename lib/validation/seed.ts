import { z } from "zod";

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine((value) => !value || z.email().safeParse(value).success, "Must be a valid email address.");

const optionalPasswordSchema = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine((value) => !value || (value.length >= 8 && value.length <= 128), "Password must be 8-128 characters.");

const optionalNameSchema = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const adminSeedEnvSchema = z.object({
  ADMIN_EMAIL: z.email("ADMIN_EMAIL must be a valid email address."),
  ADMIN_PASSWORD: z
    .string()
    .min(8, "ADMIN_PASSWORD must be at least 8 characters long.")
    .max(128, "ADMIN_PASSWORD must be 128 characters or less."),
  ADMIN_NAME: z.string().min(1).default("Admin"),
  ADMIN_MUST_CHANGE_PASSWORD: z
    .enum(["true", "false", "1", "0", "yes", "no"])
    .optional(),
  E2E_ADMIN_EMAIL: optionalEmailSchema,
  E2E_ADMIN_PASSWORD: optionalPasswordSchema,
  E2E_ADMIN_NAME: optionalNameSchema,
  E2E_ADMIN_MUST_CHANGE_PASSWORD: z.enum(["true", "false", "1", "0", "yes", "no"]).optional(),
  E2E_MEMBER_EMAIL: optionalEmailSchema,
  E2E_MEMBER_PASSWORD: optionalPasswordSchema,
  E2E_MEMBER_NAME: optionalNameSchema,
  E2E_MEMBER_MUST_CHANGE_PASSWORD: z.enum(["true", "false", "1", "0", "yes", "no"]).optional(),
});

export type AdminSeedEnv = z.infer<typeof adminSeedEnvSchema>;

export function parseBooleanFromEnv(input: string | undefined, fallback: boolean): boolean {
  if (!input) {
    return fallback;
  }

  return ["true", "1", "yes"].includes(input.toLowerCase());
}
