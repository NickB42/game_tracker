# 19 — Reuse `Intl.DateTimeFormat` Instance

## Problem

A new `Intl.DateTimeFormat` instance is created inside `formatDateTime()` on every call. When rendering a list of sessions, this is called multiple times per row.

## Files to Modify

- `app/(dashboard)/dashboard/sessions/page.tsx` (lines 33-38)
- `app/(dashboard)/dashboard/sessions/[id]/page.tsx` (lines 82-87)

## Implementation Steps

1. **Move the formatter to module scope**:
   ```typescript
   const dateFormatter = new Intl.DateTimeFormat("en-GB", {
     day: "numeric",
     month: "short",
     year: "numeric",
     hour: "2-digit",
     minute: "2-digit",
   });
   
   function formatDateTime(date: Date | string): string {
     return dateFormatter.format(new Date(date));
   }
   ```
2. **If locale needs to be dynamic**, create the formatter once per render (outside the map loop) rather than inside it.
3. **Apply the same pattern** to any other date formatting utilities in the codebase.

## Acceptance Criteria

- `Intl.DateTimeFormat` is instantiated once at module level, not per call.
- Date formatting still produces correct output.
