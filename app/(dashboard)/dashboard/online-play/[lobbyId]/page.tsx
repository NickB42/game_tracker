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
import { LobbyPageRevalidator } from "@/components/online/lobby-page-revalidator";
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
  const allActivePlayersReady = snapshot.players.length >= 2 && snapshot.players.every((player) => player.readyState);
  const shouldLiveRefresh = snapshot.lobby.status === "WAITING" || snapshot.lobby.status === "IN_PROGRESS";
  const swapLockedUserIds = snapshot.game?.publicState?.swapLockedUserIds ?? [];
  const allPlayersLockedSwap =
    snapshot.players.length > 0 && snapshot.players.every((player) => swapLockedUserIds.includes(player.userId));
  const myHand = snapshot.game?.publicState?.players.find((player) => player.userId === user.id)?.hand ?? [];
  const myFaceUp = snapshot.game?.publicState?.players.find((player) => player.userId === user.id)?.tableFaceUp ?? [];
  const myVisibleCards = [...myHand, ...myFaceUp];

  async function submitSwapFormAction(formData: FormData) {
    "use server";
    await submitOnlineSwapAction(lobbyId, {}, formData);
  }

  if (!me) {
    notFound();
  }

  return (
    <section className="space-y-6" data-testid="online-lobby-page">
      <LobbyPageRevalidator enabled={shouldLiveRefresh} />

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

          {isOwner && (snapshot.lobby.status === "WAITING" || snapshot.lobby.status === "FINISHED") ? (
            <form action={startOnlineLobbyGameAction.bind(null, lobbyId)}>
              <button
                type="submit"
                disabled={!allActivePlayersReady}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                {snapshot.lobby.status === "FINISHED" ? "Start next round" : "Start game"}
              </button>
            </form>
          ) : null}

          {isOwner && snapshot.game?.publicState?.phase === "swap" ? (
            <form action={beginOnlineTurnsAction.bind(null, lobbyId)}>
              <button
                type="submit"
                disabled={!allPlayersLockedSwap}
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

        {(snapshot.lobby.status === "WAITING" || snapshot.lobby.status === "FINISHED") && !allActivePlayersReady ? (
          <p className="mt-3 text-xs text-amber-700">All players must mark ready before the owner can start a round.</p>
        ) : null}

        {snapshot.game?.publicState?.phase === "swap" ? (
          <p className="mt-2 text-xs text-zinc-600">
            Swap lock progress: {swapLockedUserIds.length}/{snapshot.players.length} players locked their face-up selection.
          </p>
        ) : null}

        {isOwner && snapshot.game?.publicState?.phase === "swap" && !allPlayersLockedSwap ? (
          <p className="mt-2 text-xs text-amber-700">Every player must save their 3 face-up cards before you can begin turns.</p>
        ) : null}

        {snapshot.game?.publicState?.phase === "swap" ? (
          <form action={submitSwapFormAction} className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-medium text-zinc-800">Choose your 3 face-up cards</p>
            <p className="mt-1 text-xs text-zinc-600">
              You can see 6 cards here. Select exactly 3 to place face-up. The remaining 3 become your hand.
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {myVisibleCards.map((card) => (
                <label key={card.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="faceUpCardIds"
                    value={card.id}
                    defaultChecked={myFaceUp.some((existing) => existing.id === card.id)}
                    className="size-4 rounded border-zinc-300"
                  />
                  <span className="font-medium text-zinc-800">{card.rank}{card.suit}</span>
                  <span className="text-xs text-zinc-500">({card.id})</span>
                  <input type="hidden" name="visibleCardIds" value={card.id} />
                </label>
              ))}
            </div>

            <button
              type="submit"
              className="mt-3 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-white"
            >
              Save face-up selection
            </button>
          </form>
        ) : null}
      </div>

      <LobbyLiveView lobbyId={lobbyId} viewerUserId={user.id} initialSnapshot={snapshot} />
    </section>
  );
}
