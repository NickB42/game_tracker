-- Add explicit ownership columns first (nullable for safe backfill).
ALTER TABLE "Group" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "GameSession" ADD COLUMN "ownerUserId" TEXT;

-- We need a deterministic fallback for legacy rows where no creator is stored.
-- Fallback rule: earliest user by createdAt ASC, then id ASC.
DO $$
DECLARE
  has_legacy_data BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM "Group") OR EXISTS(SELECT 1 FROM "GameSession") INTO has_legacy_data;

  IF has_legacy_data AND NOT EXISTS (SELECT 1 FROM "user") THEN
    RAISE EXCEPTION 'Authorization ownership migration requires at least one user in "user" table.';
  END IF;
END $$;

WITH fallback_user AS (
  SELECT id
  FROM "user"
  ORDER BY "createdAt" ASC, id ASC
  LIMIT 1
)
UPDATE "Group" AS g
SET "ownerUserId" = fallback_user.id
FROM fallback_user
WHERE g."ownerUserId" IS NULL;

WITH fallback_user AS (
  SELECT id
  FROM "user"
  ORDER BY "createdAt" ASC, id ASC
  LIMIT 1
)
UPDATE "GameSession" AS gs
SET "ownerUserId" = COALESCE(gs."createdByUserId", fallback_user.id)
FROM fallback_user
WHERE gs."ownerUserId" IS NULL;

ALTER TABLE "Group" ALTER COLUMN "ownerUserId" SET NOT NULL;
ALTER TABLE "GameSession" ALTER COLUMN "ownerUserId" SET NOT NULL;

ALTER TABLE "Group"
  ADD CONSTRAINT "Group_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GameSession"
  ADD CONSTRAINT "GameSession_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Trusted admin join tables for explicit, auditable delegated ownership.
CREATE TABLE "GroupTrustedAdmin" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupTrustedAdmin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameSessionTrustedAdmin" (
  "id" TEXT NOT NULL,
  "gameSessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameSessionTrustedAdmin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupTrustedAdmin_groupId_userId_key" ON "GroupTrustedAdmin"("groupId", "userId");
CREATE INDEX "GroupTrustedAdmin_userId_idx" ON "GroupTrustedAdmin"("userId");

CREATE UNIQUE INDEX "GameSessionTrustedAdmin_gameSessionId_userId_key" ON "GameSessionTrustedAdmin"("gameSessionId", "userId");
CREATE INDEX "GameSessionTrustedAdmin_userId_idx" ON "GameSessionTrustedAdmin"("userId");

ALTER TABLE "GroupTrustedAdmin"
  ADD CONSTRAINT "GroupTrustedAdmin_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupTrustedAdmin"
  ADD CONSTRAINT "GroupTrustedAdmin_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameSessionTrustedAdmin"
  ADD CONSTRAINT "GameSessionTrustedAdmin_gameSessionId_fkey"
  FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameSessionTrustedAdmin"
  ADD CONSTRAINT "GameSessionTrustedAdmin_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Group_ownerUserId_idx" ON "Group"("ownerUserId");
CREATE INDEX "GameSession_ownerUserId_idx" ON "GameSession"("ownerUserId");

-- Backfill trusted-admin records:
-- 1) group owner is always trusted
-- 2) session owner is always trusted
-- 3) sessions linked to a group also inherit that group's trusted admins by default
INSERT INTO "GroupTrustedAdmin" ("id", "groupId", "userId")
SELECT CONCAT('gta_', md5(g."id" || ':' || g."ownerUserId")), g."id", g."ownerUserId"
FROM "Group" g
ON CONFLICT ("groupId", "userId") DO NOTHING;

INSERT INTO "GameSessionTrustedAdmin" ("id", "gameSessionId", "userId")
SELECT CONCAT('sta_', md5(gs."id" || ':' || gs."ownerUserId")), gs."id", gs."ownerUserId"
FROM "GameSession" gs
ON CONFLICT ("gameSessionId", "userId") DO NOTHING;

INSERT INTO "GameSessionTrustedAdmin" ("id", "gameSessionId", "userId")
SELECT CONCAT('sta_', md5(gs."id" || ':' || gta."userId")), gs."id", gta."userId"
FROM "GameSession" gs
JOIN "GroupTrustedAdmin" gta ON gta."groupId" = gs."groupId"
ON CONFLICT ("gameSessionId", "userId") DO NOTHING;
