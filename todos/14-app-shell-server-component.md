# 14 — Extract Client Logic from AppShell

## Problem

The entire `AppShell` component is marked `"use client"`, wrapping all page content. Only `usePathname()` needs client-side interactivity. This forces the entire children tree to be serialized across the client boundary.

## Files to Modify

- `components/ui/app-shell.tsx`
- Potentially create a new `components/ui/nav-link.tsx` client component

## Implementation Steps

1. **Create a small client component** for active-nav highlighting:
   ```tsx
   // components/ui/nav-link.tsx
   "use client";
   import { usePathname } from "next/navigation";
   import Link from "next/link";
   
   export function NavLink({ href, children, ...props }) {
     const pathname = usePathname();
     const isActive = pathname === href || pathname.startsWith(href + "/");
     return (
       <Link href={href} className={isActive ? "..." : "..."} {...props}>
         {children}
       </Link>
     );
   }
   ```
2. **Convert `AppShell` to a server component** — remove `"use client"`, remove `usePathname()`, and use `NavLink` for the navigation items.
3. **Handle `ToastProvider`** — if it wraps children in AppShell, it may need to remain a client boundary. Consider moving it to the layout level or wrapping only the toast UI (not all children) in a client component.
4. **Test** that navigation highlighting still works and all pages render correctly.

## Acceptance Criteria

- `AppShell` is a server component (no `"use client"` directive).
- Navigation active-state highlighting still works via the extracted client component.
- RSC payload size is reduced (less serialization across the boundary).
- No visual regression.
