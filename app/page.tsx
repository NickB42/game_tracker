import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-6">
      <main className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-zinc-500">
          Phase 1 Foundation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
          Dreierspoil Tracker
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-600">
          Project structure for a private, invite-only card game tracking app is now in place.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            href="/login"
          >
            Open login route
          </Link>
          <Link
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            href="/dashboard"
          >
            Open dashboard route
          </Link>
        </div>
      </main>
    </div>
  );
}
