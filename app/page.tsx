import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center px-6 py-16">
      <main className="app-card mx-auto grid w-full max-w-6xl gap-8 overflow-hidden p-0 md:grid-cols-[1.2fr_0.8fr]">
        <section className="p-8 md:p-10">
          <p className="app-caption uppercase tracking-[0.14em]">Private Invite-Only App</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-[var(--text-primary)] md:text-5xl">
            Dreierspoil Tracker
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[var(--text-secondary)]">
            Track sessions, rounds, winners, and online tables for your private card-game circle with one cohesive workspace.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="app-button app-button-primary" href="/login">
              Open login
            </Link>
            <Link className="app-button app-button-secondary" href="/dashboard">
              Open dashboard
            </Link>
          </div>
        </section>

        <aside className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--surface-muted)] p-8 md:border-l md:border-t-0 md:p-10">
          <div className="absolute -right-16 -top-12 h-44 w-44 rounded-full bg-[color:var(--accent-soft)] blur-2xl" aria-hidden />
          <h2 className="app-section-title relative">Everything in one flow</h2>
          <ul className="relative mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
            <li className="app-card-muted p-3">Invite-managed authentication and role-based admin controls</li>
            <li className="app-card-muted p-3">Session tracking with rounds, notes, attendance, and derived winners</li>
            <li className="app-card-muted p-3">Online Shithead lobbies with reconnection and status visibility</li>
            <li className="app-card-muted p-3">Leaderboards for global and group-focused performance</li>
          </ul>
        </aside>
      </main>
    </div>
  );
}
