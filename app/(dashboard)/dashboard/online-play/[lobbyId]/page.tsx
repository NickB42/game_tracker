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
import type { LobbySnapshot } from "@/components/online/types";
import { AppButton, PageHeader, SectionCard, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getOnlineLobbySnapshot } from "@/lib/db/online";

type PageProps = {
  params: Promise<{ lobbyId: string }>;
};

export default async function OnlineLobbyPage({ params }: PageProps) {
  const user = await requireAuthenticatedUser();
  const { lobbyId } = await params;

  let snapshot: LobbySnapshot;

  try {
    snapshot = await getOnlineLobbySnapshot(lobbyId, user.id);
  } catch {
    notFound();
  }

  const me = snapshot.players.find((player) => player.userId === user.id);
  const isOwner = snapshot.lobby.ownerUserId === user.id;
  const shouldLiveRefresh = snapshot.lobby.status === "WAITING" || snapshot.lobby.status === "IN_PROGRESS";
  const swapLockedUserIds = snapshot.game?.publicState?.swapLockedUserIds ?? [];
  const allPlayersLockedSwap =
    snapshot.players.length > 0 && snapshot.players.every((player) => swapLockedUserIds.includes(player.userId));
  const myHand = snapshot.game?.publicState?.players.find((player) => player.userId === user.id)?.hand ?? [];
  const myFaceUp = snapshot.game?.publicState?.players.find((player) => player.userId === user.id)?.tableFaceUp ?? [];
  const myVisibleCards = [...myHand, ...myFaceUp];
  const markReadyFormAction = setOnlineLobbyReadyAction.bind(null, lobbyId, true);
  const markNotReadyFormAction = setOnlineLobbyReadyAction.bind(null, lobbyId, false);
  const leaveLobbyFormAction = leaveOnlineLobbyAction.bind(null, lobbyId);
  const startGameFormAction = startOnlineLobbyGameAction.bind(null, lobbyId);
  const beginTurnsFormAction = beginOnlineTurnsAction.bind(null, lobbyId);
  const closeLobbyFormAction = closeOnlineLobbyAction.bind(null, lobbyId);
  const exportGameFormAction = exportOnlineGameAction.bind(null, lobbyId);

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

      <PageHeader
        title={`Lobby ${snapshot.lobby.code}`}
        description="Live room state, swap setup, and game table controls."
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={snapshot.lobby.status === "IN_PROGRESS" ? "accent" : "neutral"}>{snapshot.lobby.status}</StatusBadge>
            <AppButton variant="secondary" href="/dashboard/online-play">
              Back to online lobbies
            </AppButton>
          </div>
        }
      />

      {snapshot.game?.publicState?.phase === "swap" ? (
        <SectionCard title="Swap setup" description="Each player must lock exactly 3 face-up cards before active turns can begin.">
          <p className="text-sm text-[var(--text-muted)]">
            Swap lock progress: {swapLockedUserIds.length}/{snapshot.players.length} players locked their face-up selection.
          </p>
          {isOwner && !allPlayersLockedSwap ? (
            <p className="mt-2 text-xs text-[var(--warning)]">Every player must save their 3 face-up cards before turns can begin.</p>
          ) : null}

          <form action={submitSwapFormAction} className="app-card-muted mt-4 rounded-lg p-3">
            <p className="text-sm font-medium text-[var(--text-secondary)]">Choose your 3 face-up cards</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              You can see 6 cards here. Select exactly 3 to place face-up. The remaining 3 become your hand.
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {myVisibleCards.map((card) => (
                <label key={card.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="faceUpCardIds"
                    value={card.id}
                    defaultChecked={myFaceUp.some((existing) => existing.id === card.id)}
                    className="size-4 rounded border-[var(--border)]"
                  />
                  <span className="font-medium text-[var(--text-secondary)]">{card.rank}{card.suit}</span>
                  <span className="text-xs text-[var(--text-muted)]">({card.id})</span>
                  <input type="hidden" name="visibleCardIds" value={card.id} />
                </label>
              ))}
            </div>

            <button
              type="submit"
              className="app-button app-button-primary mt-3"
            >
              Save face-up selection
            </button>
          </form>
        </SectionCard>
      ) : null}

      <LobbyLiveView
        lobbyId={lobbyId}
        viewerUserId={user.id}
        initialSnapshot={snapshot}
        markReadyAction={markReadyFormAction}
        markNotReadyAction={markNotReadyFormAction}
        leaveLobbyAction={leaveLobbyFormAction}
        startGameAction={startGameFormAction}
        beginTurnsAction={beginTurnsFormAction}
        closeLobbyAction={closeLobbyFormAction}
        exportGameAction={exportGameFormAction}
      />
    </section>
  );
}
