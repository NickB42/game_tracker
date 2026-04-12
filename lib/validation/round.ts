import { z } from "zod";

const idSchema = z.string().trim().min(1).max(64);

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

const orderedSessionParticipantIdsSchema = z
  .array(idSchema)
  .min(2, "At least 2 participants are required.")
  .max(300, "Too many participants for one round.")
  .refine((ids) => new Set(ids).size === ids.length, "Each participant must appear exactly once.");

export const roundBaseInputSchema = z.object({
  gameSessionId: idSchema,
  orderedSessionParticipantIds: orderedSessionParticipantIdsSchema,
  notes: optionalTrimmedString(1000),
});

export const roundCreateInputSchema = roundBaseInputSchema;

export const roundUpdateInputSchema = roundBaseInputSchema.extend({
  id: idSchema,
});

export const roundDeleteInputSchema = z.object({
  id: idSchema,
  gameSessionId: idSchema,
});

export type RoundCreateInput = z.infer<typeof roundCreateInputSchema>;
export type RoundUpdateInput = z.infer<typeof roundUpdateInputSchema>;
export type RoundDeleteInput = z.infer<typeof roundDeleteInputSchema>;
