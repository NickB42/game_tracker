import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const GROUP_LOCK_MESSAGE =
  "Group cannot be changed after rounds have been recorded for this session.";

export const PARTICIPANTS_LOCK_MESSAGE =
  "Participants cannot be changed after rounds have been recorded for this session.";

export type SessionEditLockReasons = {
  groupLocked: boolean;
  participantsLocked: boolean;
};

export async function getSessionEditLockReasons(
  gameSessionId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<SessionEditLockReasons> {
  const roundsCount = await db.roundResult.count({
    where: {
      gameSessionId,
    },
  });

  const locked = roundsCount > 0;

  return {
    groupLocked: locked,
    participantsLocked: locked,
  };
}
