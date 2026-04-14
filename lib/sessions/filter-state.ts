import type { ActivityType } from "@prisma/client";

export type SessionsActivityFilter = "ALL" | ActivityType;

export type SessionsFilterState = {
  activity: SessionsActivityFilter;
  groupId?: string;
};

export function parseSessionsActivityFilter(value: string | undefined): SessionsActivityFilter {
  if (value === "CARD" || value === "SQUASH" || value === "PADEL") {
    return value;
  }

  return "ALL";
}

export function buildSessionsQueryString(state: SessionsFilterState): string {
  const searchParams = new URLSearchParams();

  if (state.activity !== "ALL") {
    searchParams.set("activity", state.activity);
  }

  if (state.groupId) {
    searchParams.set("groupId", state.groupId);
  }

  return searchParams.toString();
}

export function buildSessionsHref(state: SessionsFilterState): string {
  const query = buildSessionsQueryString(state);
  return query ? `/dashboard/sessions?${query}` : "/dashboard/sessions";
}

export function buildNewSessionHref(state: SessionsFilterState): string {
  const query = buildSessionsQueryString(state);
  return query ? `/dashboard/sessions/new?${query}` : "/dashboard/sessions/new";
}
