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

const playerIdSchema = z.string().trim().min(1).max(64);
const userIdSchema = z.string().trim().min(1).max(64);
const activityTypeSchema = z.enum(["CARD", "SQUASH", "PADEL"]);

export const groupInputSchema = z.object({
  activityType: activityTypeSchema,
  name: z
    .string()
    .trim()
    .min(1, "Group name is required.")
    .max(80, "Group name must be 80 characters or fewer."),
  description: optionalTrimmedString(500),
  trustedAdminUserIds: z.array(userIdSchema).max(100, "Too many trusted admins selected.").default([]),
});

export const groupMembershipUpdateInputSchema = z.object({
  groupId: z.string().trim().min(1).max(64),
  playerIds: z
    .array(playerIdSchema)
    .max(300, "Too many players selected.")
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate player IDs are not allowed."),
});

export const groupWithMembersInputSchema = groupInputSchema.extend({
  id: z.string().trim().min(1),
  playerIds: z.array(playerIdSchema).max(300, "Too many players selected."),
});

export type GroupInput = z.infer<typeof groupInputSchema>;
export type GroupMembershipUpdateInput = z.infer<typeof groupMembershipUpdateInputSchema>;
export type GroupWithMembersInput = z.infer<typeof groupWithMembersInputSchema>;