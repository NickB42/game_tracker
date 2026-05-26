# 06 — Add Suspense Boundaries and Per-Route Loading States

## Problem

Zero `<Suspense>` boundaries exist in the app. A single `dashboard/loading.tsx` is the only loading state. Pages block entirely until all queries complete.

## Files to Create/Modify

Create `loading.tsx` files:
- `app/(dashboard)/dashboard/sessions/loading.tsx`
- `app/(dashboard)/dashboard/sessions/[id]/loading.tsx`
- `app/(dashboard)/dashboard/leaderboards/loading.tsx`
- `app/(dashboard)/dashboard/players/loading.tsx`
- `app/(dashboard)/dashboard/groups/loading.tsx`
- `app/(dashboard)/dashboard/online-play/loading.tsx`

Optionally add `<Suspense>` in pages with multiple data sections:
- `app/(dashboard)/dashboard/sessions/[id]/page.tsx` — wrap rounds and matches sections

## Implementation Steps

1. **Create skeleton loading components** for each route. Keep them simple — a few animated placeholder bars matching the layout of each page:
   ```tsx
   export default function Loading() {
     return (
       <div className="animate-pulse space-y-4">
         <div className="h-8 w-48 bg-gray-200 rounded" />
         <div className="space-y-2">
           {Array.from({ length: 5 }).map((_, i) => (
             <div key={i} className="h-16 bg-gray-200 rounded" />
           ))}
         </div>
       </div>
     );
   }
   ```
2. **Add `<Suspense>` boundaries** in the session detail page around the rounds/matches sections so the header renders immediately while data-heavy sections stream in.
3. **Match the existing Tailwind styles** (dark mode support via the theme classes used in the app).
4. **Test** by adding artificial delays (`await new Promise(r => setTimeout(r, 2000))`) to data fetching functions and verifying loading states appear.

## Acceptance Criteria

- Each major route shows a skeleton/loading state during navigation.
- The session detail page streams the header first, then rounds/matches.
- No visual regression — loading states match the app's design system.
