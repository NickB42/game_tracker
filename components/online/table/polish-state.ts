import type { LobbySnapshot } from "@/components/online/types";

type LobbyEvent = LobbySnapshot["events"][number];

type EventTone = "neutral" | "info" | "success" | "warning" | "danger";

export type EventSummary = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  tone: EventTone;
  important: boolean;
};

export type TableEffectBadge = {
  label: string;
  tone: "emerald" | "amber" | "sky" | "zinc";
};

export type BlindPlayOutcome = {
  eventId: string;
  actorUserId: string | null;
  moveNumber: number | null;
  status: "success" | "pickup";
  message: string;
  revealedCard: {
    rank: string;
    suit: string;
  } | null;
};

export type RoundFinishSummary = {
  winnerName: string;
  loserName: string;
};

function parseMovePayload(payload: unknown): { move?: { type?: string }; events?: string[] } {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const value = payload as { move?: { type?: string }; events?: string[] };
  return {
    move: value.move,
    events: Array.isArray(value.events) ? value.events : undefined,
  };
}

function formatEventTime(value: string | Date): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(11, 19);
}

function actorNameOf(event: LobbyEvent, playerNamesById: Map<string, string>): string {
  if (!event.actorUserId) {
    return "System";
  }

  return playerNamesById.get(event.actorUserId) ?? "Player";
}

function firstEngineEvent(payload: unknown): string | null {
  const parsed = parseMovePayload(payload);

  if (!parsed.events || parsed.events.length === 0) {
    return null;
  }

  return parsed.events[0] ?? null;
}

export function humanizeEventLine(line: string | null, playerNamesById: Map<string, string>): string | null {
  if (!line) {
    return null;
  }

  let result = line;

  for (const [userId, name] of playerNamesById.entries()) {
    result = result.replaceAll(userId, name);
  }

  return result;
}

export function summarizeLobbyEvent(event: LobbyEvent, playerNamesById: Map<string, string>): EventSummary {
  const actor = actorNameOf(event, playerNamesById);
  const time = formatEventTime(event.createdAt);
  const engineLine = humanizeEventLine(firstEngineEvent(event.payload), playerNamesById);

  if (event.type === "move_applied") {
    const parsed = parseMovePayload(event.payload);
    const moveType = parsed.move?.type ?? "move";
    const title =
      moveType === "blind_play"
        ? `${actor} played blind`
        : moveType === "pickup"
          ? `${actor} picked up`
          : moveType === "face_up_pickup"
            ? `${actor} face-up pickup`
            : `${actor} played`;

    const important = Boolean(parsed.events?.some((line) => line.includes("burned") || line.includes("loser") || line.includes("skipped")));

    return {
      id: event.id,
      title,
      detail: engineLine ?? "Move resolved.",
      timestamp: time,
      tone: important ? "warning" : "info",
      important,
    };
  }

  if (event.type === "turns_began") {
    return {
      id: event.id,
      title: "Turns started",
      detail: "Swap phase ended and active turns began.",
      timestamp: time,
      tone: "success",
      important: true,
    };
  }

  if (event.type === "game_started") {
    return {
      id: event.id,
      title: "Round started",
      detail: `${actor} started a new round.`,
      timestamp: time,
      tone: "success",
      important: true,
    };
  }

  if (event.type === "player_joined" || event.type === "player_reconnected") {
    return {
      id: event.id,
      title: `${actor} joined`,
      detail: event.type === "player_reconnected" ? "Reconnected to lobby." : "Joined the lobby.",
      timestamp: time,
      tone: "info",
      important: false,
    };
  }

  if (event.type === "player_left") {
    return {
      id: event.id,
      title: `${actor} left`,
      detail: "Left the lobby.",
      timestamp: time,
      tone: "warning",
      important: false,
    };
  }

  return {
    id: event.id,
    title: event.type.replaceAll("_", " "),
    detail: engineLine ?? "State updated.",
    timestamp: time,
    tone: "neutral",
    important: false,
  };
}

export function getSpecialEffectBadge(
  publicState: NonNullable<NonNullable<LobbySnapshot["game"]>["publicState"]> | null,
  latestEvents: LobbySnapshot["events"],
): TableEffectBadge | null {
  if (!publicState) {
    return null;
  }

  if (publicState.effectivePile.sevenRuleActive) {
    return { label: "7 or lower active", tone: "amber" };
  }

  if (publicState.effectivePile.resetByTwo) {
    return { label: "2 reset", tone: "sky" };
  }

  const latestMove = [...latestEvents].reverse().find((event) => event.type === "move_applied");
  const parsed = latestMove ? parseMovePayload(latestMove.payload) : undefined;
  const hasSkip = Boolean(parsed?.events?.some((line) => line.includes("skipped")));
  const hasBurn = Boolean(parsed?.events?.some((line) => line.includes("Pile burned")));

  if (hasBurn) {
    return { label: "Pile burned", tone: "emerald" };
  }

  if (hasSkip) {
    return { label: "Skip effect", tone: "zinc" };
  }

  if (publicState.effectivePile.latestEffectiveRank === "3") {
    return { label: "3 transparent", tone: "zinc" };
  }

  return null;
}

export function detectBurnPulse(events: LobbySnapshot["events"], seenEventId: string | null): { shouldPulse: boolean; latestEventId: string | null } {
  const latestMove = [...events].reverse().find((event) => event.type === "move_applied");

  if (!latestMove) {
    return { shouldPulse: false, latestEventId: seenEventId };
  }

  if (latestMove.id === seenEventId) {
    return { shouldPulse: false, latestEventId: seenEventId };
  }

  const parsed = parseMovePayload(latestMove.payload);
  const hasBurn = Boolean(parsed.events?.some((line) => line.includes("Pile burned")));

  return {
    shouldPulse: hasBurn,
    latestEventId: latestMove.id,
  };
}

export function toneClasses(tone: EventTone): string {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (tone === "danger") {
    return "border-red-200 bg-red-50 text-red-900";
  }

  if (tone === "info") {
    return "border-sky-200 bg-sky-50 text-sky-900";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-800";
}

export function getLatestBlindPlayOutcome(events: LobbySnapshot["events"]): BlindPlayOutcome | null {
  const latestBlind = [...events]
    .reverse()
    .find((event) => event.type === "move_applied" && parseMovePayload(event.payload).move?.type === "blind_play");

  if (!latestBlind) {
    return null;
  }

  const parsed = parseMovePayload(latestBlind.payload);
  const payload = latestBlind.payload as { blindRevealedCard?: { rank?: unknown; suit?: unknown }; moveNumber?: unknown };
  const maybeCard = payload.blindRevealedCard;
  const moveNumber = typeof payload.moveNumber === "number" ? payload.moveNumber : null;
  const revealedCard =
    maybeCard && typeof maybeCard.rank === "string" && typeof maybeCard.suit === "string"
      ? { rank: maybeCard.rank, suit: maybeCard.suit }
      : null;
  const line = parsed.events?.find((entry) => entry.includes("randomly flipped")) ?? "Blind card resolved.";
  const pickedUp = line.includes("could not play") || line.includes("picked up the pile");

  return {
    eventId: latestBlind.id,
    actorUserId: latestBlind.actorUserId,
    moveNumber,
    status: pickedUp ? "pickup" : "success",
    message: line,
    revealedCard,
  };
}

export function getRoundFinishSummary(
  publicState: NonNullable<NonNullable<LobbySnapshot["game"]>["publicState"]> | null,
  players: LobbySnapshot["players"],
): RoundFinishSummary | null {
  if (!publicState || publicState.phase !== "finished") {
    return null;
  }

  const winnerUserId = publicState.eliminationOrder?.[0] ?? null;
  const loserUserId = publicState.loserUserId;

  if (!winnerUserId || !loserUserId) {
    return null;
  }

  const winnerName = players.find((player) => player.userId === winnerUserId)?.name ?? "Winner";
  const loserName = players.find((player) => player.userId === loserUserId)?.name ?? "Shithead";

  return {
    winnerName,
    loserName,
  };
}
