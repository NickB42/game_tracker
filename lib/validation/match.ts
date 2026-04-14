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

const scoreSchema = z.number().int().min(0).max(99);
const setScoreSchema = z.number().int().min(0).max(7);

const sportsActivityTypeSchema = z.enum(["SQUASH", "PADEL"]);

const padelSetSchema = z.object({
  sideOneGames: setScoreSchema,
  sideTwoGames: setScoreSchema,
});

function getSetWinner(sideOneGames: number, sideTwoGames: number): 1 | 2 | null {
  if (sideOneGames === sideTwoGames) {
    return null;
  }

  const maxGames = Math.max(sideOneGames, sideTwoGames);
  const minGames = Math.min(sideOneGames, sideTwoGames);

  if (maxGames < 6) {
    return null;
  }

  if (maxGames === 6) {
    if (minGames <= 4) {
      return sideOneGames > sideTwoGames ? 1 : 2;
    }

    return null;
  }

  if (maxGames === 7) {
    if (minGames === 5 || minGames === 6) {
      return sideOneGames > sideTwoGames ? 1 : 2;
    }

    return null;
  }

  return null;
}

export const sportsMatchBaseInputSchema = z
  .object({
    gameSessionId: idSchema,
    activityType: sportsActivityTypeSchema,
    sideOneSessionParticipantIds: z.array(idSchema).max(2, "Too many participants selected for side 1."),
    sideTwoSessionParticipantIds: z.array(idSchema).max(2, "Too many participants selected for side 2."),
    squashScoreSideOne: scoreSchema.optional(),
    squashScoreSideTwo: scoreSchema.optional(),
    padelSets: z.array(padelSetSchema).max(3, "A maximum of 3 sets is allowed. ").default([]),
    notes: optionalTrimmedString(1000),
  })
  .superRefine((value, ctx) => {
    const allParticipantIds = [...value.sideOneSessionParticipantIds, ...value.sideTwoSessionParticipantIds];

    if (new Set(allParticipantIds).size !== allParticipantIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sideOneSessionParticipantIds"],
        message: "Each match participant must be selected exactly once.",
      });
    }

    if (value.activityType === "SQUASH") {
      if (value.sideOneSessionParticipantIds.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sideOneSessionParticipantIds"],
          message: "Squash requires exactly 1 participant on side 1.",
        });
      }

      if (value.sideTwoSessionParticipantIds.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sideTwoSessionParticipantIds"],
          message: "Squash requires exactly 1 participant on side 2.",
        });
      }

      if (value.squashScoreSideOne === undefined || value.squashScoreSideTwo === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["squashScoreSideOne"],
          message: "Enter both squash scores.",
        });

        return;
      }

      if (value.squashScoreSideOne === value.squashScoreSideTwo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["squashScoreSideOne"],
          message: "Squash scores cannot end in a tie.",
        });
      }

      const winningScore = Math.max(value.squashScoreSideOne, value.squashScoreSideTwo);
      const losingScore = Math.min(value.squashScoreSideOne, value.squashScoreSideTwo);

      if (winningScore < 11 || winningScore - losingScore < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["squashScoreSideOne"],
          message: "Squash score must be a valid game result (winner >= 11 with 2-point lead).",
        });
      }

      return;
    }

    if (value.sideOneSessionParticipantIds.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sideOneSessionParticipantIds"],
        message: "Padel requires exactly 2 participants on side 1.",
      });
    }

    if (value.sideTwoSessionParticipantIds.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sideTwoSessionParticipantIds"],
        message: "Padel requires exactly 2 participants on side 2.",
      });
    }

    if (value.padelSets.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["padelSets"],
        message: "Padel requires at least 2 completed sets.",
      });
      return;
    }

    const setWinners: Array<1 | 2> = [];

    for (let i = 0; i < value.padelSets.length; i += 1) {
      const set = value.padelSets[i];
      const winner = getSetWinner(set.sideOneGames, set.sideTwoGames);

      if (!winner) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["padelSets", i],
          message: "Each set must be a valid tennis-style score (6-0..6-4, 7-5, or 7-6).",
        });
        continue;
      }

      setWinners.push(winner);
    }

    if (setWinners.length !== value.padelSets.length) {
      return;
    }

    const firstTwoSideOneWins = setWinners.slice(0, 2).filter((winner) => winner === 1).length;
    const firstTwoSideTwoWins = setWinners.slice(0, 2).filter((winner) => winner === 2).length;

    if (firstTwoSideOneWins === 1 && firstTwoSideTwoWins === 1 && value.padelSets.length !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["padelSets"],
        message: "A third set is required when the first two sets are split.",
      });
    }

    if ((firstTwoSideOneWins === 2 || firstTwoSideTwoWins === 2) && value.padelSets.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["padelSets"],
        message: "Do not enter a third set when one side has already won 2-0.",
      });
    }

    const totalSideOneWins = setWinners.filter((winner) => winner === 1).length;
    const totalSideTwoWins = setWinners.filter((winner) => winner === 2).length;

    if (totalSideOneWins === totalSideTwoWins) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["padelSets"],
        message: "Padel match must produce a winner.",
      });
    }
  });

export const sportsMatchCreateInputSchema = sportsMatchBaseInputSchema;

export const sportsMatchUpdateInputSchema = sportsMatchBaseInputSchema.extend({
  id: idSchema,
});

export const sportsMatchDeleteInputSchema = z.object({
  id: idSchema,
  gameSessionId: idSchema,
});

export type SportsMatchCreateInput = z.infer<typeof sportsMatchCreateInputSchema>;
export type SportsMatchUpdateInput = z.infer<typeof sportsMatchUpdateInputSchema>;
export type SportsMatchDeleteInput = z.infer<typeof sportsMatchDeleteInputSchema>;

export type SportsMatchScoreLineInput = {
  sequenceNumber: number;
  sideNumber: number;
  score: number;
};

export type SportsMatchResultPayload = {
  winningSideNumber: number;
  scoreLines: SportsMatchScoreLineInput[];
};

export function deriveSportsMatchResultPayload(
  input: SportsMatchCreateInput | SportsMatchUpdateInput,
): SportsMatchResultPayload {
  if (input.activityType === "SQUASH") {
    const sideOneScore = input.squashScoreSideOne as number;
    const sideTwoScore = input.squashScoreSideTwo as number;

    return {
      winningSideNumber: sideOneScore > sideTwoScore ? 1 : 2,
      scoreLines: [
        {
          sequenceNumber: 1,
          sideNumber: 1,
          score: sideOneScore,
        },
        {
          sequenceNumber: 1,
          sideNumber: 2,
          score: sideTwoScore,
        },
      ],
    };
  }

  const setWins = {
    sideOne: 0,
    sideTwo: 0,
  };

  for (const set of input.padelSets) {
    if (set.sideOneGames > set.sideTwoGames) {
      setWins.sideOne += 1;
    } else {
      setWins.sideTwo += 1;
    }
  }

  return {
    winningSideNumber: setWins.sideOne > setWins.sideTwo ? 1 : 2,
    scoreLines: input.padelSets.flatMap((set, index) => [
      {
        sequenceNumber: index + 1,
        sideNumber: 1,
        score: set.sideOneGames,
      },
      {
        sequenceNumber: index + 1,
        sideNumber: 2,
        score: set.sideTwoGames,
      },
    ]),
  };
}
