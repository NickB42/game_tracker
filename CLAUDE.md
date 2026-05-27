# Claude / Coding Agent Context

This project also has `AGENTS.md`. Treat that as the canonical, detailed agent guide. This file repeats the most important repo context so Claude-style agents have useful local instructions even if they do not follow imports.

## Critical Next.js Warning

This is Next.js 16.2.3 with React 19.2.4. It has breaking changes compared with older App Router examples and model-memory assumptions.

Before changing App Router code, read the relevant docs in `node_modules/next/dist/docs/`, especially fetching, mutations, server/client components, caching, revalidation, layouts, pages, and error handling.

In this repo, route `params` and `searchParams` are commonly Promises and are awaited in Server Components.

## Project Summary

Dreierspoil Tracker is a private, invite-only web app for tracking:

- Players
- Groups
- Game sessions
- Card rounds
- Squash and Padel matches
- Global and group leaderboards
- Online card-game lobbies

The app supports `CARD`, `SQUASH`, and `PADEL` activities. Online play is card-only.

Important current domain rule: groups are activity-agnostic. A `Group` has members, owner, trusted admins, sessions, and archive state, but no `activityType`. `GameSession.activityType` is the only activity source of truth.

## Stack

- Next.js App Router
- React
- TypeScript
- PostgreSQL
- Prisma
- Better Auth
- Tailwind CSS
- Zod
- Playwright
- Node test runner plus `tsx`

## Commands

Prefer `npm.cmd` / `npx.cmd` in Windows PowerShell:

```powershell
npm.cmd run dev
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:dev
npm.cmd run prisma:migrate:deploy
npm.cmd run db:seed
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
npm.cmd run test:unit
npm.cmd run test:e2e
```

The unit-test package script uses Unix command substitution. If it fails in PowerShell, use:

```powershell
$files = Get-ChildItem tests\unit -Filter *.test.ts | ForEach-Object { $_.FullName }
node --import tsx --test $files
```

If `tsx` fails with an esbuild platform-binary error, `node_modules` has the wrong optional dependency for the current OS. Ask before running `npm install` or `npm ci`.

## Important Paths

- `app/(auth)`: auth routes.
- `app/(dashboard)/dashboard`: protected app pages.
- `app/api`: auth, health, and online route handlers.
- `actions`: Server Actions.
- `components/ui`: shared primitives and layout.
- `components/sessions`: session UI and activity-specific session sections.
- `components/groups`: group UI.
- `components/leaderboards`: leaderboard UI.
- `components/online`: online play UI.
- `lib/db`: Prisma data access.
- `lib/validation`: Zod schemas.
- `lib/domain`: authorization and safety rules.
- `lib/rating`: OpenSkill and Elo strategy.
- `lib/online`: pure online game engine.
- `prisma/schema.prisma`: data model.
- `tests/unit`: unit and source-invariant tests.
- `tests/e2e`: Playwright smoke tests.
- `docs/online-play.md`: online architecture.
- `docs/multi-activity-release-runbook.md`: release checks.

## Domain Rules

Groups:

- Activity-neutral membership and permission scope.
- Used for member filtering, trusted admins, session visibility, and group leaderboards.
- A single group can contain Card, Squash, and Padel sessions.
- Do not reintroduce `Group.activityType` or mismatch checks between group and session activity.

Sessions:

- `GameSession.activityType` controls activity-specific behavior.
- `CARD` uses `RoundResult` and `RoundPlacement`.
- `SQUASH` and `PADEL` use `Match`, `MatchParticipant`, `MatchResult`, and `MatchScoreLine`.
- `PADEL` sessions require at least 4 participants.
- Activity cannot be changed after rounds or matches exist.
- Archived sessions are read-only until unarchived.
- Groups assigned to sessions must exist and not be archived.

Leaderboards:

- Implemented in `lib/db/leaderboards.ts`.
- Filter by `GameSession.activityType`.
- Optionally scope by `GameSession.groupId`.
- Card ratings use OpenSkill.
- Squash and Padel ratings use Elo.
- Group leaderboards should show all activity tabs for every group.

Online play:

- Card-only.
- Server-authoritative.
- Pure game rules live in `lib/online/shithead-engine.ts`.
- DB lifecycle lives in `lib/db/online.ts`.
- Export creates `GameSession` with `source = ONLINE` and `activityType = "CARD"`.

## Auth And Authorization

Use guards from `lib/auth/guards.ts`:

- `requireAuthenticatedUser`
- `requireAdminUser`
- `requireUserWithPendingPasswordChange`

Use authorization helpers from `lib/domain/authorization.ts`:

- `canCreateGroup`, `canEditGroup`, `canViewGroup`
- `canCreateSession`, `canEditSession`, `canViewSession`
- `buildGroupVisibilityWhere`
- `buildSessionVisibilityWhere`

Never rely only on UI gating. Server Actions and route handlers must authenticate and authorize internally.

## Implementation Patterns

- Server pages fetch with `requireAuthenticatedUser()` and `lib/db/*`.
- Client forms use `useActionState` and Server Actions from `actions/*`.
- Server Actions parse `FormData`, validate with Zod, write inside transactions when needed, call `revalidatePath`, then redirect.
- Use existing UI primitives before adding new components.
- Keep DB queries and Prisma includes/selects narrow.
- Use `ResponsiveList` for desktop table + mobile card list.
- Use `ActivityBadge` for sessions/activity rows, not groups.
- Keep comments sparse and useful.

## Prisma And Data Safety

- Use Prisma migrations for schema changes.
- Do not use `prisma db push` for production-bound changes.
- Regenerate Prisma client after schema edits.
- Keep relation deletion behavior intentional.
- Check source-invariant tests after schema/domain changes.

Recent important schema state:

- `Group.activityType` has been removed.
- `GameSession.activityType` remains required and defaults to `CARD`.

## Testing Expectations

Run what is practical for the change:

- `npm.cmd run lint`
- `npx.cmd tsc --noEmit`
- `npm.cmd run test:unit`
- Targeted Playwright smoke tests for UI workflows

If a test command cannot run because of local environment issues, report the exact blocker and what did run.

## Keep These Docs In Sync

When changing activity, group, session, leaderboard, online-play, auth, or deployment behavior, update:

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- Relevant files under `docs/`
- Unit invariant tests

