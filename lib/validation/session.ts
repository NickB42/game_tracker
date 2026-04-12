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

const idSchema = z.string().trim().min(1).max(64);

const participantIdsSchema = z
  .array(idSchema)
  .min(2, "Select at least 2 participants.")
  .max(300, "Too many participants selected.")
  .refine((ids) => new Set(ids).size === ids.length, "Duplicate participant IDs are not allowed.");

const playedAtSchema = z
  .coerce
  .date()
  .refine((value) => !Number.isNaN(value.getTime()), "Played at date/time is required.");

export const gameSessionInputSchema = z.object({
  groupId: idSchema.optional(),
  title: optionalTrimmedString(120),
  playedAt: playedAtSchema,
  notes: optionalTrimmedString(1000),
  participantIds: participantIdsSchema,
});

export const gameSessionUpdateInputSchema = gameSessionInputSchema.extend({
  id: idSchema,
});

export const sessionParticipantsUpdateInputSchema = z.object({
  gameSessionId: idSchema,
  participantIds: participantIdsSchema,
});

export type GameSessionInput = z.infer<typeof gameSessionInputSchema>;
export type GameSessionUpdateInput = z.infer<typeof gameSessionUpdateInputSchema>;
export type SessionParticipantsUpdateInput = z.infer<typeof sessionParticipantsUpdateInputSchema>;
