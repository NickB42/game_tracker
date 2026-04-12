import Link from "next/link";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGameSessions } from "@/lib/db/sessions";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function SessionsPage() {
  const user = await requireAuthenticatedUser();
  const sessions = await getGameSessions();

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Game sessions</h1>
          <p className="mt-1 text-sm text-zinc-600">Track each played session with explicit attendance.</p>
        </div>
        {user.role === "ADMIN" ? (
          <Link
            href="/dashboard/sessions/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            New session
          </Link>
        ) : null}
      </header>

      {sessions.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">No sessions created yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-medium">Played at</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Group</th>
                <th className="px-4 py-3 font-medium">Participants</th>
                <th className="px-4 py-3 font-medium">Created by</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white text-zinc-800">
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="whitespace-nowrap px-4 py-3">{formatDateTime(session.playedAt)}</td>
                  <td className="px-4 py-3 font-medium">{session.title ?? "Untitled session"}</td>
                  <td className="px-4 py-3">{session.group?.name ?? "No group"}</td>
                  <td className="px-4 py-3">{session._count.participants}</td>
                  <td className="px-4 py-3">{session.createdByUser?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link className="text-zinc-900 underline" href={`/dashboard/sessions/${session.id}`}>
                        View
                      </Link>
                      {user.role === "ADMIN" ? (
                        <Link className="text-zinc-900 underline" href={`/dashboard/sessions/${session.id}/edit`}>
                          Edit
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
