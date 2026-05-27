<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses Next.js 16.2.3 with React 19.2.4. APIs, conventions, caching defaults, route props, and file structure may differ from model training data or older App Router examples.

Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/`. Pay attention to deprecation notices and especially docs for:

- `01-app/01-getting-started/03-layouts-and-pages.md`
- `01-app/01-getting-started/05-server-and-client-components.md`
- `01-app/01-getting-started/06-fetching-data.md`
- `01-app/01-getting-started/07-mutating-data.md`
- `01-app/01-getting-started/08-caching.md`
- `01-app/01-getting-started/09-revalidating.md`
- `01-app/01-getting-started/10-error-handling.md`

Do not assume older Next.js behavior. In this repo, page `params` and `searchParams` are commonly typed as Promises and awaited in Server Components.
<!-- END:nextjs-agent-rules -->

# Dreierspoil Tracker Agent Guide

This file is repo memory for coding agents. Read it before changing code.

## Product Summary

Dreierspoil Tracker is a private, invite-only dashboard for tracking game sessions, groups, players, leaderboards, and online card play.

The app supports three activity types:

- `CARD`: card sessions with rounds and placements.
- `SQUASH`: manual sports sessions with match results.
- `PADEL`: manual sports sessions with match results and at least 4 session participants.

Important current domain rule: groups are activity-agnostic. A `Group` is a membership and permission scope only. A single group can be used by Card, Squash, and Padel sessions. `GameSession.activityType` is the source of truth for activity-specific behavior.

Online multiplayer remains card-only. Do not expose sports online play unless the product direction changes.

## Tech Stack

- Next.js 16.2.3 App Router
- React 19.2.4
- TypeScript
- PostgreSQL
- Prisma ORM 6.19.x
- Better Auth with Prisma adapter
- Tailwind CSS 4
- Zod 4 validation
- Node test runner with `tsx`
- Playwright smoke tests

## Common Commands

Prefer `npm.cmd` in Windows PowerShell because `npm.ps1` may be blocked by execution policy.

```powershell
npm.cmd run dev
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:dev
npm.cmd run prisma:migrate:deploy
npm.cmd run db:seed
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
```

Unit tests:

```powershell
npm.cmd run test:unit
```

The package script uses Unix command substitution: `$(find tests/unit -name '*.test.ts')`. In Windows PowerShell this may not expand correctly. A local Windows equivalent is:

```powershell
$files = Get-ChildItem tests\unit -Filter *.test.ts | ForEach-Object { $_.FullName }
node --import tsx --test $files
```

If tests fail before assertions with an esbuild platform error, `node_modules` likely contains the wrong optional esbuild binary for the current OS. Do not run dependency installs without user approval.

## Repository Layout

- `app/`: Next.js App Router routes.
  - `app/(auth)`: login and forced-password-change routes.
  - `app/(dashboard)/dashboard`: protected dashboard routes.
  - `app/api`: route handlers for auth, health, and online play.
- `actions/`: Server Actions. Files begin with `"use server"`.
- `components/`: UI components grouped by domain.
  - `components/ui`: shared shell, primitives, responsive list, toast, form controls.
  - `components/sessions`: session cards/forms and activity-specific sections.
  - `components/groups`, `components/players`, `components/leaderboards`, `components/online`.
- `lib/`: core domain, DB, auth, validation, rating, and online logic.
  - `lib/db`: Prisma data access.
  - `lib/validation`: Zod schemas.
  - `lib/domain`: authorization and safety rules.
  - `lib/rating`: OpenSkill and Elo rating logic.
  - `lib/online`: pure online card-game engine and UI model helpers.
- `prisma/`: schema, seed, and migrations.
- `tests/unit`: Node test runner unit/source-invariant tests.
- `tests/e2e`: Playwright smoke tests.
- `docs/`: release and online architecture notes.
- `todos/`: performance and cleanup notes.

## App Router Conventions In This Repo

- Server pages fetch directly from `lib/db/*` after calling auth guards.
- Client forms call imported Server Actions from `actions/*` using `useActionState`.
- Many route components type props like:

```ts
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ activity?: string }>;
};
```

Then:

```ts
const [{ id }, { activity }] = await Promise.all([params, searchParams]);
```

- Use `redirect` and `notFound` from `next/navigation` in Server Components and server-side code as existing pages do.
- Mutating Server Actions must authenticate and authorize internally. Server Actions are reachable over POST and must not trust UI-only restrictions.
- After mutations, use `revalidatePath` for affected dashboards and redirect to the final page, matching existing action patterns.

## Authentication And Authorization

Auth lives in:

- `lib/auth/auth.ts`
- `lib/auth/guards.ts`
- `lib/auth/api-guards.ts`
- `lib/auth/user-management.ts`

Use these guards:

- `requireAuthenticatedUser()` for protected dashboard routes/actions.
- `requireAdminUser()` for admin-only pages.
- `requireUserWithPendingPasswordChange()` for forced password routes.

Authorization rules live in `lib/domain/authorization.ts`.

Roles:

- `ADMIN`: full access.
- `MEMBER`: access based on ownership, trusted admin status, direct participation, or linked group membership.

Group rules:

- Anyone authenticated as `ADMIN` or `MEMBER` can create groups.
- Members can view groups they own, administer, or belong to.
- Members can edit groups they own or administer.

Session rules:

- Anyone authenticated as `ADMIN` or `MEMBER` can create sessions.
- Members can view sessions they own, administer, participate in, or can access through linked group ownership/admin/membership.
- Members can edit sessions they own or administer.
- Linked group owners/admins/members can see sessions through group linkage, but edit requires session owner/admin unless admin.

Always use `buildGroupVisibilityWhere(actor)` and `buildSessionVisibilityWhere(actor)` for list/detail data access unless there is a very deliberate reason not to.

## Core Data Model

Key Prisma models:

- `User`: Better Auth user plus app fields: role, ban state, linked `playerId`, `mustChangePassword`.
- `Player`: participant identity used in sessions/groups/matches.
- `Group`: activity-agnostic named membership and permission scope. No `activityType`.
- `GroupMembership`: group-player membership.
- `GroupTrustedAdmin`: group-user admin permission.
- `GameSession`: activity-bearing session. Has optional `groupId`, `ownerUserId`, `activityType`, `playedAt`, source, archive state.
- `SessionParticipant`: players in a session.
- `RoundResult` and `RoundPlacement`: card activity results.
- `Match`, `MatchParticipant`, `MatchResult`, `MatchScoreLine`: sports activity results.
- `OnlineLobby`, `OnlineLobbyPlayer`, `OnlineGame`, `OnlineGamePlayer`, `OnlineGameEvent`: online card play.

Activity ownership:

- `GameSession.activityType` controls Card/Squash/Padel behavior.
- `Group` must stay activity-neutral.
- Leaderboards filter by `GameSession.activityType`, optionally scoped by `GameSession.groupId`.

## Activity-Specific Behavior

Card:

- Uses `RoundResult` and `RoundPlacement`.
- Round placement entry lives under session round routes.
- Rating system: OpenSkill.
- Online export creates card sessions only.

Squash:

- Uses sports `Match` tables.
- Manual match entry only.
- Rating system: Elo.

Padel:

- Uses sports `Match` tables.
- Session validation requires at least 4 participants.
- Match validation expects team-oriented participant layout.
- Rating system: Elo.

Rating strategy is in `lib/rating/strategy.ts`.

## Session Safety Rules

Safety code lives in `lib/domain/safety.ts` and `lib/db/sessions.ts`.

- Archived sessions are read-only until unarchived.
- Activity cannot be changed after rounds or matches have been recorded.
- Group and participants are locked after card rounds have been recorded.
- Participant changes are validated against active/non-archived players.
- Groups assigned to sessions must exist and not be archived.
- Groups do not need to match activity, because groups have no activity.

Be careful when editing session update flows; preserving recorded-result integrity is more important than convenience.

## Groups

Groups are used for:

- Membership lists.
- Trusted admins.
- Session visibility through linked groups.
- Optional scoping of session lists and leaderboards.

Groups are not used for:

- Activity type selection.
- Limiting sessions to Card/Squash/Padel.
- Rating strategy.

Group trusted admins are copied/inherited into linked sessions when sessions are created or edited. See `setSessionTrustedAdmins`.

## Leaderboards

Leaderboard data lives in `lib/db/leaderboards.ts`.

- `getGlobalLeaderboard({ activityType })` builds an activity leaderboard across all visible history.
- `getGroupLeaderboard(groupId, actor, { activityType })` verifies group visibility and builds a leaderboard scoped by `groupId` and selected activity.
- Default activity is `CARD` when absent.
- Card history reads round results.
- Sports history reads completed matches with valid winning side.
- History window is controlled by `LEADERBOARD_HISTORY_MONTHS`.

Do not add group activity mismatch checks. They are intentionally gone.

## Online Play

See `docs/online-play.md`.

Important files:

- `lib/online/shithead-engine.ts`: pure rules engine.
- `lib/db/online.ts`: lobby/game DB lifecycle.
- `actions/online.ts`: lobby Server Actions.
- `app/api/online/lobbies/[lobbyId]/*`: snapshot, events, stream, moves.
- `components/online/*`: online UI.

Rules:

- Server-authoritative state.
- Hidden cards stay in private JSON.
- Move legality is validated server-side.
- Online export creates `GameSession` with `source = ONLINE` and `activityType = "CARD"`.

## Validation Pattern

Use Zod schemas in `lib/validation/*` for parsing form payloads and business-level validation.

Patterns:

- Trim optional strings and convert empty strings to `undefined`.
- Keep ID schemas bounded with min/max.
- Use `.superRefine` for cross-field rules, such as Padel participant minimums.
- Return flattened field errors from Server Actions.

Relevant schemas:

- `lib/validation/group.ts`
- `lib/validation/session.ts`
- `lib/validation/round.ts`
- `lib/validation/match.ts`
- `lib/validation/player.ts`
- `lib/validation/online.ts`
- `lib/validation/auth.ts`
- `lib/validation/user-management.ts`

## UI Patterns

- Use existing primitives from `components/ui/primitives.tsx`, `components/ui/form-primitives.tsx`, `components/ui/form-actions.tsx`, and `components/ui/responsive-list.tsx`.
- Keep dashboard UI dense and functional.
- Prefer server-side data fetching in route components.
- Use client components for interactive forms only where needed.
- Use `ActivityBadge` only for sessions/activity-specific rows, not for groups.
- `ResponsiveList` is the standard pattern for table-on-desktop/card-on-mobile lists.
- Forms use `PendingInteractionLock`, `FormSubmitButton`, and `useActionState`.
- Navigation/action buttons use icons from `components/ui/icons.tsx` and existing `AppButton` variants.

## Database And Migrations

- Schema source: `prisma/schema.prisma`.
- Use Prisma migrations, not `prisma db push`, for production-compatible changes.
- Generate client after schema changes: `npm.cmd run prisma:generate`.
- Deployment migration command: `npm.cmd run prisma:migrate:deploy`.
- Local migration command: `npm.cmd run prisma:migrate:dev`.
- Seed entry: `prisma/seed.ts`.

Recent important migration:

- `20260527235500_remove_group_activity_type`: drops legacy `Group.activityType`, making groups activity-agnostic.

When changing relations or constraints, inspect existing migrations and tests in `tests/unit/*invariants*`.

## Testing Notes

Unit tests are a mix of actual logic tests and source-shape/invariant tests. They may assert that certain strings exist or do not exist in files/functions.

Useful checks:

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run test:unit
npm.cmd run test:e2e
```

E2E smoke tests require configured `E2E_*` users. Playwright may start the dev server automatically if `PLAYWRIGHT_BASE_URL` is absent.

High-value smoke paths:

- Login.
- Forced password change.
- Admin user management.
- Player creation.
- Card session + round.
- Squash session + match.
- Padel session + match.
- Global and group leaderboards for all activities.
- Activity isolation: no cross-activity leaderboard leakage.
- Online play page remains card-only.

## Windows-Specific Notes

- Use `npm.cmd`, `npx.cmd`, and `where.exe` style commands when PowerShell policy blocks shims.
- The repo may have platform-specific optional dependencies in `node_modules`. Do not run `npm install` or `npm ci` without user approval.
- The `test:unit` script is Unix-flavored and may need the PowerShell equivalent shown above.

## Coding Guidelines

- Prefer existing patterns over new abstractions.
- Keep DB access in `lib/db/*`.
- Keep auth/authorization checks server-side and close to the data/mutation.
- Keep validation in `lib/validation/*`.
- Use transactions for multi-step writes that must stay consistent.
- Preserve archive and edit-lock behavior.
- Avoid broad refactors when implementing a focused change.
- After changing Prisma schema, update generated client and any source-invariant tests.
- Do not remove safety checks unless the domain rule changed and tests/docs are updated.

## Documentation To Keep In Sync

When activity/session/group behavior changes, review:

- `README.md`
- `docs/multi-activity-release-runbook.md`
- `docs/online-play.md`
- `AGENTS.md`
- `CLAUDE.md`
- Unit invariant tests

