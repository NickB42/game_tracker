"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import {
  DashboardIcon,
  GroupIcon,
  OnlineIcon,
  SessionIcon,
  SettingsIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type AppShellProps = {
  children: ReactNode;
  user: {
    name: string;
    email: string;
    role: string;
  };
};

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/dashboard/players", label: "Players", icon: <UsersIcon /> },
  { href: "/dashboard/groups", label: "Groups", icon: <GroupIcon /> },
  { href: "/dashboard/sessions", label: "Sessions", icon: <SessionIcon /> },
  { href: "/dashboard/leaderboards", label: "Leaderboards", icon: <TrophyIcon /> },
  { href: "/dashboard/online-play", label: "Online Play", icon: <OnlineIcon /> },
  { href: "/dashboard/settings/security", label: "Settings", icon: <SettingsIcon /> },
];

function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname.startsWith(href);
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <div className="app-shell min-h-screen">
        <header className="app-topbar">
          <div className="app-page-container flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-5">
              <Link href="/dashboard" className="app-brand" data-testid="app-brand-link">
                Dreierspoil Tracker
              </Link>

              <nav className="app-nav" aria-label="Primary">
                {NAV_ITEMS.map((item) => {
                  const active = isNavItemActive(pathname, item.href);

                  return (
                    <Link key={item.href} href={item.href} className={active ? "app-nav-link is-active" : "app-nav-link"}>
                      <span className="mr-1 inline-flex align-middle">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              <details className="app-user-menu">
                <summary className="app-user-summary">
                  <span className="app-badge app-badge-accent">{user.role}</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{user.name}</span>
                </summary>
                <div className="app-user-panel">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{user.email}</p>
                  <div className="app-divider my-3" />
                  <LogoutButton />
                </div>
              </details>
            </div>
          </div>
        </header>

        <div className="app-page-container app-layout pb-10 pt-8">
          <aside className="app-side-rail" aria-label="Desktop navigation">
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item.href);

              return (
                <Link key={item.href} href={item.href} className={active ? "app-rail-link is-active" : "app-rail-link"}>
                  <span className="inline-flex shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
