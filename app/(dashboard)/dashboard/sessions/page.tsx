import Link from "next/link";

import { ActivityBadge } from "@/components/sessions/activity-badge";
import { SessionCard } from "@/components/sessions/session-card";
import { PlusIcon } from "@/components/ui/icons";
import { AppButton, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canCreateSession, canEditSession } from "@/lib/domain/authorization";
import { getGroups } from "@/lib/db/groups";
import { getGameSessions } from "@/lib/db/sessions";
import { measureAsync } from "@/lib/server/timing";
import {
  buildNewSessionHref,
  buildSessionsHref,
  parseSessionsActivityFilter,
  type SessionsActivityFilter,
  type SessionsFilterState,
} from "@/lib/sessions/filter-state";

type SessionListRow = {
  id: string;
  activityType: "CARD" | "SQUASH" | "PADEL";
  title: string | null;
  playedAt: Date;
  updatedAt: Date;
  group: { id: string; name: string } | null;
  ownerUserId: string;
  trustedAdmins: Array<{ id: string; userId: string }>;
  _count: {
    participants: number;
    roundResults: number;
    matches: number;
  };
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(value: Date) {
  return dateFormatter.format(value);
}

type SessionsPageProps = {
  searchParams: Promise<{
    activity?: string;
    groupId?: string;
    page?: string;
  }>;
};

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const user = await measureAsync("dashboard.sessions.auth", () => requireAuthenticatedUser());
  const { activity, groupId, page: pageParam } = await searchParams;
  const activityFilter = parseSessionsActivityFilter(activity);
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const rawGroupId = groupId ?? undefined;

  const [groups, { sessions: rawSessions, hasNextPage }] = await Promise.all([
    measureAsync("dashboard.sessions.groups", () => getGroups(user)),
    measureAsync("dashboard.sessions.list", () =>
      getGameSessions(user, {
        activityType: activityFilter === "ALL" ? undefined : activityFilter,
        groupId: rawGroupId,
        page: currentPage,
      }),
    ),
  ]);

  const validGroupId = rawGroupId && groups.some((group) => group.id === rawGroupId) ? rawGroupId : undefined;
  const sessions = rawSessions as unknown as SessionListRow[];

  const activeFilterState = {
    activity: activityFilter,
    groupId: validGroupId,
  } as SessionsFilterState;

  const quickCreateHref = buildNewSessionHref(activeFilterState);
  const returnTo = encodeURIComponent(buildSessionsHref(activeFilterState));

  function formatResultCount(session: SessionListRow) {
    if (session.activityType === "CARD") {
      return `${session._count.roundResults} rounds`;
    }

    return `${session._count.matches} matches`;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Game Sessions"
        actions={
          canCreateSession(user) ? (
            <AppButton href={quickCreateHref} className="app-icon-button" data-testid="sessions-create-link">
              <PlusIcon />
              <span className="sr-only">New session</span>
            </AppButton>
          ) : (
            <StatusBadge>Read Only</StatusBadge>
          )
        }
      />

      <div className="space-y-3" data-testid="sessions-filters">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[
            { value: "ALL", label: "All" },
            { value: "CARD", label: "Card" },
            { value: "SQUASH", label: "Squash" },
            { value: "PADEL", label: "Padel" },
          ].map((entry) => (
            <Link
              key={entry.value}
              href={buildSessionsHref({
                activity: entry.value as SessionsActivityFilter,
                groupId: validGroupId,
              })}
              className={`app-button whitespace-nowrap ${activityFilter === entry.value ? "app-button-primary" : "app-button-ghost"}`}
              data-testid={`sessions-activity-filter-${entry.value.toLowerCase()}`}
            >
              {entry.label}
            </Link>
          ))}
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" data-testid="sessions-group-filter-links">
          <Link
            href={buildSessionsHref({ activity: activityFilter })}
            className={`app-button whitespace-nowrap ${validGroupId ? "app-button-ghost" : "app-button-secondary"}`}
          >
            All groups
          </Link>
          {groups.map((group) => (
            <Link
              key={group.id}
              href={buildSessionsHref({ activity: activityFilter, groupId: group.id })}
              className={`app-button whitespace-nowrap ${validGroupId === group.id ? "app-button-secondary" : "app-button-ghost"}`}
            >
              {group.name}
            </Link>
          ))}
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          description={
            activityFilter === "ALL"
              ? "Create your first session to start recording rounds and match results."
              : `No ${activityFilter.toLowerCase()} sessions found for the selected filters.`
          }
        />
      ) : (
        <ResponsiveList
          data={sessions}
          testId="sessions-list"
          desktopHeaders={
            <tr>
              <th>Played at</th>
              <th>Title</th>
              <th>Activity</th>
              <th>Group</th>
              <th>Participants</th>
              <th>Results</th>
              <th>Last update</th>
              <th>Actions</th>
            </tr>
          }
          mobile={(session) => (
            <SessionCard
              session={session}
              returnTo={returnTo}
            />
          )}
          desktop={(session) => (
            <tr key={session.id}>
              <td className="whitespace-nowrap">{formatDateTime(session.playedAt)}</td>
              <td className="font-medium text-[var(--text-primary)]">{session.title ?? "Untitled session"}</td>
              <td>
                <ActivityBadge activityType={session.activityType} />
              </td>
              <td>{session.group?.name ?? "No group"}</td>
              <td>{session._count.participants}</td>
              <td>{formatResultCount(session)}</td>
              <td className="whitespace-nowrap">{formatDateTime(session.updatedAt)}</td>
              <td>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="app-button app-button-ghost"
                    href={`/dashboard/sessions/${session.id}?returnTo=${returnTo}`}
                    data-testid={`session-row-open-${session.id}`}
                  >
                    View
                  </Link>
                  {canEditSession(user, {
                    isOwner: session.ownerUserId === user.id,
                    isTrustedAdmin: session.trustedAdmins.length > 0,
                    isParticipant: false,
                    isLinkedGroupOwner: false,
                    isLinkedGroupTrustedAdmin: false,
                    isLinkedGroupMember: false,
                  }) ? (
                    <Link className="app-button app-button-secondary" href={`/dashboard/sessions/${session.id}/edit`}>
                      Edit
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          )}
        />
      )}

      {(currentPage > 1 || hasNextPage) && (
        <div className="flex items-center justify-between pt-2">
          {currentPage > 1 ? (
            <Link
              className="app-button app-button-secondary"
              href={buildSessionsHref({ ...activeFilterState, page: currentPage - 1 })}
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-[var(--text-muted)]">Page {currentPage}</span>
          {hasNextPage ? (
            <Link
              className="app-button app-button-secondary"
              href={buildSessionsHref({ ...activeFilterState, page: currentPage + 1 })}
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </section>
  );
}
