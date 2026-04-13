import Link from "next/link";

import { AppButton, DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canCreateSession, canEditSession } from "@/lib/domain/authorization";
import { getGameSessions } from "@/lib/db/sessions";

type SessionListRow = {
  id: string;
  title: string | null;
  playedAt: Date;
  group: { id: string; name: string } | null;
  createdByUser: { id: string; name: string } | null;
  ownerUserId: string;
  trustedAdmins: Array<{ id: string; userId: string }>;
  _count: {
    participants: number;
  };
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function SessionsPage() {
  const user = await requireAuthenticatedUser();
  const sessions = (await getGameSessions(user)) as unknown as SessionListRow[];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Game Sessions"
        description="Track each played session with attendance, ownership, and round history."
        actions={
          canCreateSession(user) ? <AppButton href="/dashboard/sessions/new">New Session</AppButton> : <StatusBadge>Read Only</StatusBadge>
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          description="Create your first session to start recording rounds and winners."
          action={canCreateSession(user) ? <AppButton href="/dashboard/sessions/new">Create Session</AppButton> : null}
        />
      ) : (
        <DataTable>
          <table className="app-table min-w-full">
            <thead>
              <tr>
                <th>Played at</th>
                <th>Title</th>
                <th>Group</th>
                <th>Participants</th>
                <th>Created by</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="whitespace-nowrap">{formatDateTime(session.playedAt)}</td>
                  <td className="font-medium text-[var(--text-primary)]">{session.title ?? "Untitled session"}</td>
                  <td>{session.group?.name ?? "No group"}</td>
                  <td>{session._count.participants}</td>
                  <td>{session.createdByUser?.name ?? "Unknown"}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Link className="app-button app-button-ghost" href={`/dashboard/sessions/${session.id}`}>
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
