# Multi-Activity Release Runbook (Phase 5)

This runbook covers production hardening and release readiness for multi-activity support:

- Activities: CARD, SQUASH, PADEL
- Sports workflows: manual match entry only
- Online play: CARD only

## 1. Preconditions

1. Deploy includes all migrations through `20260414123000_multi_activity_foundation`.
2. Preview/staging smoke checks are green before production deployment.
3. Backup and rollback paths are prepared:
   - managed Postgres point-in-time restore capability
   - previous app build artifact available for rollback
4. Env vars are present for runtime, migration, and smoke users.

## 2. Deployment Order

1. Pull latest code revision.
2. Run Prisma client generation and schema validation:
   - `npx prisma validate`
   - `npx prisma generate`
3. Apply migrations using deploy-safe command:
   - `npx prisma migrate deploy`
4. Build and deploy app revision.
5. Verify migration status:
   - `npx prisma migrate status`

Do not use `prisma db push` for production.

## 3. Data Safety Verification Queries

Run these SQL checks against production after deploy:

```sql
-- 1) No null activity values after migration
SELECT
  SUM(CASE WHEN "activityType" IS NULL THEN 1 ELSE 0 END) AS null_group_activity,
  (SELECT SUM(CASE WHEN "activityType" IS NULL THEN 1 ELSE 0 END) FROM "GameSession") AS null_session_activity
FROM "Group";

-- 2) Legacy rows should be CARD unless intentionally changed later
SELECT "activityType", COUNT(*) FROM "GameSession" GROUP BY "activityType" ORDER BY "activityType";
SELECT "activityType", COUNT(*) FROM "Group" GROUP BY "activityType" ORDER BY "activityType";

-- 3) Cross-activity linkage mismatch should be zero
SELECT COUNT(*) AS mismatched_group_session_activity
FROM "GameSession" gs
JOIN "Group" g ON g."id" = gs."groupId"
WHERE gs."activityType" <> g."activityType";
```

Expected results:

- `null_group_activity = 0`
- `null_session_activity = 0`
- `mismatched_group_session_activity = 0`

## 4. Post-Deploy Smoke Matrix

Use deterministic smoke coverage for release confidence:

1. CARD legacy flow:
   - create CARD session
   - add round
   - verify CARD leaderboard entry
2. SQUASH flow:
   - create SQUASH session
   - add best-of-1 match
   - verify SQUASH leaderboard entry
3. PADEL flow:
   - create PADEL session
   - add valid 4-player match result
   - verify PADEL leaderboard entry
4. Shared sessions UX:
   - filter persistence in URL
   - return context from session detail back to filtered list
5. Activity isolation:
   - CARD-only players absent from SQUASH board and vice versa
6. Online routes:
   - online play page available
   - no sports online path exposed

Convenience command:

```bash
./scripts/postdeploy-smoke.sh
```

## 5. Performance and Query Risk Checks

Targeted high-traffic query safeguards already in schema/migrations:

- `Group_activityType_idx`
- `GameSession_activityType_idx`
- `Match_gameSessionId_idx`
- `Match_gameSessionId_sequenceNumber_key`
- `MatchParticipant_matchId_sideNumber_idx`
- `MatchScoreLine_matchResultId_sequenceNumber_idx`

Review with query plans only if production telemetry indicates regression. Avoid speculative index churn.

## 6. Rollback Guidance

Choose rollback path based on failure type.

### A) App-only regression (migrations succeeded)

1. Roll back app to previous known-good build.
2. Keep migrated schema in place.
3. Re-run smoke matrix and confirm stability.

### B) Migration/application mismatch

1. Stop rollout and disable write traffic if needed.
2. Restore database to pre-deploy snapshot or PITR target.
3. Roll back app to revision compatible with restored schema.
4. Validate `/api/health`, auth, and core dashboard routes.

### C) Data integrity anomaly

1. Run integrity queries from Section 3.
2. If mismatch count is non-zero:
   - halt session creation writes
   - collect affected IDs
   - perform controlled corrective SQL in maintenance window
3. Re-run smoke matrix before reopening traffic.

## 7. Known Limitations (Explicit)

- Online multiplayer remains CARD-only.
- E2E smoke execution requires configured `E2E_*` credentials.
- Global typecheck has a pre-existing unrelated test typing issue in `tests/unit/online-ui-model.test.ts` (`isMyTurn`), tracked separately.

## 8. Release Checklist (GO/NO-GO)

Mark all before GO:

- [ ] `npx prisma validate` passes
- [ ] `npx prisma generate` passes
- [ ] `npx prisma migrate status` shows up to date
- [ ] lint/typecheck status reviewed (only known unrelated failures allowed)
- [ ] unit suite passes
- [ ] smoke matrix passes in target environment
- [ ] data safety SQL checks match expected zeros
- [ ] rollback owner and steps confirmed

If any critical check fails, declare NO-GO and resolve before production traffic.
