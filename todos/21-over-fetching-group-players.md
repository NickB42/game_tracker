# 21 — Reduce Over-Fetching in Group Queries

## Problem

`groupByIdInclude` uses `include: { player: true }` which fetches ALL columns of the Player model (notes, timestamps, etc.) when only `id` and `displayName` are needed.

## Files to Modify

- `lib/db/groups.ts` (lines 32-35)

## Implementation Steps

1. **Replace `include` with `select`** for the player relation:
   ```typescript
   const groupByIdInclude = {
     memberships: {
       include: {
         player: {
           select: {
             id: true,
             displayName: true,
             isActive: true,
           },
         },
       },
     },
     trustedAdmins: {
       include: {
         user: {
           select: { id: true, name: true, email: true },
         },
       },
     },
     owner: {
       select: { id: true, name: true, email: true },
     },
   };
   ```
2. **Check all consumers** of the group detail data to ensure they don't use fields that are now excluded.
3. **Apply the same pattern** to other queries that use `player: true` or `user: true` without needing all columns.

## Acceptance Criteria

- Group detail queries transfer less data from the database.
- All UI that displays group members still works (only needs id + displayName).
- No TypeScript errors from missing fields.
