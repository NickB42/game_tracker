#!/usr/bin/env bash
set -euo pipefail

MAX_RETRIES="${PRISMA_MIGRATE_DEPLOY_MAX_RETRIES:-5}"
BASE_DELAY_SECONDS="${PRISMA_MIGRATE_DEPLOY_BASE_DELAY_SECONDS:-5}"

echo "[build:deploy] Generating Prisma client"
npx prisma generate

if [[ "${SKIP_PRISMA_MIGRATE_DEPLOY:-false}" == "true" ]]; then
  echo "[build:deploy] SKIP_PRISMA_MIGRATE_DEPLOY=true, skipping prisma migrate deploy"
else
  attempt=1

  while true; do
    echo "[build:deploy] Running prisma migrate deploy (attempt ${attempt}/${MAX_RETRIES})"

    set +e
    MIGRATE_OUTPUT="$(npx prisma migrate deploy 2>&1)"
    MIGRATE_EXIT_CODE=$?
    set -e

    if [[ ${MIGRATE_EXIT_CODE} -eq 0 ]]; then
      echo "${MIGRATE_OUTPUT}"
      break
    fi

    echo "${MIGRATE_OUTPUT}"

    if [[ ${attempt} -ge ${MAX_RETRIES} ]]; then
      echo "[build:deploy] prisma migrate deploy failed after ${attempt} attempts"
      exit ${MIGRATE_EXIT_CODE}
    fi

    if [[ "${MIGRATE_OUTPUT}" != *"Timed out trying to acquire a postgres advisory lock"* ]] && [[ "${MIGRATE_OUTPUT}" != *"Error: P1002"* ]]; then
      echo "[build:deploy] Non-retriable migrate failure"
      exit ${MIGRATE_EXIT_CODE}
    fi

    delay_seconds=$((BASE_DELAY_SECONDS * attempt))
    echo "[build:deploy] Advisory lock contention detected; retrying in ${delay_seconds}s"
    sleep "${delay_seconds}"
    attempt=$((attempt + 1))
  done
fi

echo "[build:deploy] Building Next.js app"
npx next build
