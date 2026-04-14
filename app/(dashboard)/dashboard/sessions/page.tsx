import Link from "next/link";

import { ActivityBadge } from "@/components/sessions/activity-badge";
import { AppButton, DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canCreateSession, canEditSession } from "@/lib/domain/authorization";
import { getGroups } from "@/lib/db/groups";
import { getGameSessions } from "@/lib/db/sessions";
import {
  buildNewSessionHref,
  buildSessionsHref,
  parseSessionsActivityFilter,
  type SessionsActivityFilter,
} from "@/lib/sessions/filter-state";

type SessionListRow = {
  id: string;
  activityType: "CARD" | "SQUASH" | "PADEL";
  title: string | null;
  playedAt: Date;
  updatedAt: Date;
  group: { id: string; name: string } | null;
  createdByUser: { id: string; name: string } | null;
  ownerUserId: string;
  trustedAdmins: Array<{ id: string; userId: string }>;
  _count: {
    participants: number;
    roundResults: number;
    matches: number;
  };
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

type SessionsPageProps = {
  searchParams: Promise<{
    activity?: string;
    groupId?: string;
  }>;
};

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const user = await requireAuthenticatedUser();
  const { activity, groupId } = await searchParams;
  const activityFilter = parseSessionsActivityFilter(activity);

  const groups = await getGroups(user);
  const selectedGroupId = groupId && groups.some((group) => group.id === groupId) ? groupId : undefined;

  const selectableGroups =
    activityFilter === "ALL"
      ? groups
      : groups.filter((group) => group.activityType === activityFilter);

  const sessions = (await getGameSessions(user, {
    activityType: activityFilter === "ALL" ? undefined : activityFilter,
    groupId: selectedGroupId,
  })) as unknown as SessionListRow[];

  const latestSessionForActivity =
    activityFilter === "ALL"
      ? null
      : sessions.find((session) => session.activityType === activityFilter) ?? null;

  const activeFilterState = {
    activity: activityFilter,
    groupId: selectedGroupId,
  } as {
    activity: SessionsActivityFilter;
    groupId?: string;
  };

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
        description="One shared list for card and sports sessions with fast filtering and quick entry actions."
        actions={
          canCreateSession(user) ? <AppButton href={quickCreateHref}>New Session</AppButton> : <StatusBadge>Read Only</StatusBadge>
        }
      />

      <div className="app-card-muted flex flex-wrap items-end gap-3 p-3" data-testid="sessions-filters">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Activity</p>
          <div className="flex flex-wrap items-center gap-2">
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
                  groupId:
                    selectedGroupId &&
                    (entry.value === "ALL" || selectableGroups.some((group) => group.id === selectedGroupId))
                      ? selectedGroupId
                      : undefined,
                })}
                className={`app-button ${activityFilter === entry.value ? "app-button-primary" : "app-button-ghost"}`}
                data-testid={`sessions-activity-filter-${entry.value.toLowerCase()}`}
              >
                {entry.label}
              </Link>
            ))}
          </div>
        </div>

        <form method="get" className="ml-auto flex flex-wrap items-end gap-2" data-testid="sessions-group-filter-form">
          {activityFilter !== "ALL" ? <input type="hidden" name="activity" value={activityFilter} /> : null}
          <label htmlFor="groupId" className="text-sm text-[var(--text-secondary)]">
            Group
          </label>
          <select id="groupId" name="groupId" defaultValue={selectedGroupId ?? ""} className="app-select min-w-44">
            <option value="">All groups</option>
            {selectableGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <button type="submit" className="app-button app-button-secondary" data-testid="sessions-group-filter-apply">
            Apply
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2" data-testid="sessions-quick-actions">
        {canCreateSession(user) ? (
          <AppButton href={quickCreateHref} variant="secondary" data-testid="sessions-quick-create">
            Create {activityFilter === "ALL" ? "Session" : `${activityFilter.toLowerCase()} session`}
          </AppButton>
        ) : null}
        {latestSessionForActivity ? (
          <AppButton
            href={`/dashboard/sessions/${latestSessionForActivity.id}`}
            variant="ghost"
            data-testid="sessions-open-latest-activity"
          >
            Open latest {activityFilter.toLowerCase()} session
          </AppButton>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          description={
            activityFilter === "ALL"
              ? "Create your first session to start recording rounds and match results."
              : `No ${activityFilter.toLowerCase()} sessions found for the selected filters.`
          }
          action={canCreateSession(user) ? <AppButton href={quickCreateHref}>Create Session</AppButton> : null}
        />
      ) : (
        <DataTable>
          <table className="app-table min-w-full">
            <thead>
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
            </thead>
            <tbody>
              {sessions.map((session) => (
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
              ))}
            </tbody>
          </table>
        </DataTable>
      )}
    </section>
  );
}
