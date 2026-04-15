import { z } from "zod";
import { ActivityType } from "@prisma/client";

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

const gameSessionBaseObjectSchema = z.object({
  activityType: z.nativeEnum(ActivityType).default(ActivityType.CARD),
  groupId: idSchema.optional(),
  title: optionalTrimmedString(120),
  playedAt: playedAtSchema,
  notes: optionalTrimmedString(1000),
  participantIds: participantIdsSchema,
  trustedAdminUserIds: z.array(idSchema).max(100, "Too many trusted admins selected.").default([]),
});

function validateActivityParticipantMinimum(
  value: { activityType: ActivityType; participantIds: string[] },
  ctx: z.RefinementCtx,
) {
  if (value.activityType === ActivityType.PADEL && value.participantIds.length < 4) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["participantIds"],
      message: "Padel sessions require at least 4 participants.",
    });
  }
}

export const gameSessionInputSchema = gameSessionBaseObjectSchema.superRefine(validateActivityParticipantMinimum);

export const gameSessionUpdateInputSchema = gameSessionBaseObjectSchema
  .extend({
    id: idSchema,
  })
  .superRefine(validateActivityParticipantMinimum);

export const sessionParticipantsUpdateInputSchema = z.object({
  gameSessionId: idSchema,
  participantIds: participantIdsSchema,
});

export type GameSessionInput = z.infer<typeof gameSessionInputSchema>;
export type GameSessionUpdateInput = z.infer<typeof gameSessionUpdateInputSchema>;
export type SessionParticipantsUpdateInput = z.infer<typeof sessionParticipantsUpdateInputSchema>;
