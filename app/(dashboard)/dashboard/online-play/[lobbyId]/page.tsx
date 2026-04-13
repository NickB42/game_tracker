import Link from "next/link";
import { notFound } from "next/navigation";

import {
  beginOnlineTurnsAction,
  closeOnlineLobbyAction,
  exportOnlineGameAction,
  leaveOnlineLobbyAction,
  setOnlineLobbyReadyAction,
  startOnlineLobbyGameAction,
  submitOnlineSwapAction,
} from "@/actions/online";
import { LobbyLiveView } from "@/components/online/lobby-live-view";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getOnlineLobbySnapshot } from "@/lib/db/online";

type PageProps = {
  params: Promise<{ lobbyId: string }>;
};

export default async function OnlineLobbyPage({ params }: PageProps) {
  const user = await requireAuthenticatedUser();
  const { lobbyId } = await params;

  let snapshot;

  try {
    snapshot = await getOnlineLobbySnapshot(lobbyId, user.id);
  } catch {
    notFound();
  }

  const me = snapshot.players.find((player) => player.userId === user.id);
  const isOwner = snapshot.lobby.ownerUserId === user.id;
  const myHand = snapshot.game?.publicState?.players.find((player) => player.userId === user.id)?.hand ?? [];
  const myFaceUp = snapshot.game?.publicState?.players.find((player) => player.userId === user.id)?.tableFaceUp ?? [];

  async function submitSwapFormAction(formData: FormData) {
    "use server";
    await submitOnlineSwapAction(lobbyId, {}, formData);
  }

  if (!me) {
    notFound();
  }

  return (
    <section className="space-y-6" data-testid="online-lobby-page">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <Link href="/dashboard/online-play" className="text-sm text-zinc-700 underline">
          Back to online lobbies
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">Lobby {snapshot.lobby.code}</h1>
        <p className="mt-1 text-sm text-zinc-600">Share this code with authenticated users to join.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <form action={setOnlineLobbyReadyAction.bind(null, lobbyId, !me.readyState)}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {me.readyState ? "Mark not ready" : "Mark ready"}
            </button>
          </form>

          <form action={leaveOnlineLobbyAction.bind(null, lobbyId)}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Leave lobby
            </button>
          </form>

          {isOwner && snapshot.lobby.status === "WAITING" ? (
            <form action={startOnlineLobbyGameAction.bind(null, lobbyId)}>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Start game
              </button>
            </form>
          ) : null}

          {isOwner && snapshot.game?.publicState?.phase === "swap" ? (
            <form action={beginOnlineTurnsAction.bind(null, lobbyId)}>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Begin turns
              </button>
            </form>
          ) : null}

          {isOwner ? (
            <form action={closeOnlineLobbyAction.bind(null, lobbyId)}>
              <button
                type="submit"
                className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Close lobby
              </button>
            </form>
          ) : null}

          {snapshot.game?.status === "FINISHED" ? (
            <form action={exportOnlineGameAction.bind(null, lobbyId)}>
              <button
                type="submit"
                className="rounded-lg border border-green-300 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
              >
                Export to tracker
              </button>
            </form>
          ) : null}
        </div>

        {snapshot.game?.publicState?.phase === "swap" ? (
          <form action={submitSwapFormAction} className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-medium text-zinc-800">Swap phase helper</p>
            <p className="mt-1 text-xs text-zinc-600">
              This button currently locks your current hand/face-up setup without swapping. Full drag-and-swap UX can be added in v2.
            </p>
            {myHand.map((card) => (
              <input key={card.id} type="hidden" name="handCardIds" value={card.id} />
            ))}
            {myFaceUp.map((card) => (
              <input key={card.id} type="hidden" name="faceUpCardIds" value={card.id} />
            ))}
            <button
              type="submit"
              className="mt-3 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-white"
            >
              Lock current cards
            </button>
          </form>
        ) : null}
      </div>

      <LobbyLiveView lobbyId={lobbyId} viewerUserId={user.id} initialSnapshot={snapshot} />
    </section>
  );
}
