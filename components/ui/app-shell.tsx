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
  { href: "/dashboard/settings", label: "Settings", icon: <SettingsIcon /> },
];

const MOBILE_TAB_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: <DashboardIcon /> },
  { href: "/dashboard/groups", label: "Groups", icon: <GroupIcon /> },
  { href: "/dashboard/sessions", label: "Sessions", icon: <SessionIcon /> },
  { href: "/dashboard/leaderboards", label: "Boards", icon: <TrophyIcon /> },
  { href: "/dashboard/online-play", label: "Online", icon: <OnlineIcon /> },
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
              <details className="app-user-menu">
                <summary className="app-user-summary">
                  <span className={user.role === "ADMIN" ? "app-badge app-badge-accent" : "app-badge"}>{`Signed in · ${user.role}`}</span>
                </summary>
                <div className="app-user-panel">
                  <p className="text-sm text-[var(--text-secondary)]">Log out of your account?</p>
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

        <nav className="app-mobile-tabs" aria-label="Mobile primary navigation">
          {MOBILE_TAB_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "app-mobile-tab is-active" : "app-mobile-tab"}
                aria-label={item.label}
                title={item.label}
              >
                <span className="app-mobile-tab-icon">{item.icon}</span>
                <span className="sr-only">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </ToastProvider>
  );
}
