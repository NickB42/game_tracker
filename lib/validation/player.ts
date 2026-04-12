import { z } from "zod";

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.string().max(maxLength, `Must be ${maxLength} characters or fewer.`).optional(),
  );

export const playerInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(80, "Display name must be 80 characters or fewer."),
  notes: optionalTrimmedString(500),
  isActive: z.boolean(),
});

export const playerUpdateInputSchema = playerInputSchema.extend({
  id: z.string().trim().min(1),
});

export type PlayerInput = z.infer<typeof playerInputSchema>;
export type PlayerUpdateInput = z.infer<typeof playerUpdateInputSchema>;