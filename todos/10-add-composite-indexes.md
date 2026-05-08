# 10 — Add Composite Database Indexes

## Problem

Common query patterns filter and sort on multiple columns but only single-column indexes exist, causing the database to scan more rows than necessary.

## Files to Modify

- `prisma/schema.prisma`
- New migration file

## Implementation Steps

1. **Add composite indexes** to the schema:
   ```prisma
   model GameSession {
     // ...existing fields...
     
     @@index([groupId, playedAt])
     @@index([activityType, archivedAt, playedAt])
     // keep existing single-column indexes
   }
   
   model RoundResult {
     // ...existing fields...
     
     @@index([gameSessionId, archivedAt])
     // keep existing single-column indexes
   }
   ```
2. **Create a migration**:
   ```bash
   npm run prisma:migrate:dev -- --name add_composite_indexes
   ```
3. **Verify** by running `EXPLAIN ANALYZE` on the leaderboard and session-list queries to confirm index usage.

## Acceptance Criteria

- Migration applies cleanly to an existing database.
- Leaderboard and session list queries use the new composite indexes.
- No existing queries are negatively affected.
