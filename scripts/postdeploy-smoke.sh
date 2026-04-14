#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${PLAYWRIGHT_BASE_URL:-${BASE_URL:-http://127.0.0.1:3000}}"

echo "[postdeploy] Checking health endpoint at ${BASE_URL}/api/health"
HEALTH_RESPONSE="$(curl -fsS "${BASE_URL}/api/health")"
echo "[postdeploy] Health response: ${HEALTH_RESPONSE}"

echo "[postdeploy] Running Prisma migration status check"
npx prisma migrate status

echo "[postdeploy] Suggested smoke command set:"
echo "npm run test:e2e -- tests/e2e/gameplay/session-and-round.smoke.spec.ts tests/e2e/gameplay/sessions-ux.smoke.spec.ts tests/e2e/leaderboards/global.smoke.spec.ts tests/e2e/leaderboards/sports-activity.smoke.spec.ts tests/e2e/leaderboards/activity-isolation.smoke.spec.ts"

echo "[postdeploy] Reminder: online flow remains card-only by design for this release."
