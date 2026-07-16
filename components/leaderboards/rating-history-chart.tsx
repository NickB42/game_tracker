"use client";

import { useEffect, useRef, useState } from "react";

import type { ActivityType } from "@prisma/client";

import type { RatingHistoryPoint, RatingHistorySeries } from "@/lib/db/leaderboards";

const CHART_WIDTH = 960;
const MIN_TIMELINE_WIDTH = 704;
const MIN_COMPACT_WIDTH = 320;
const CHART_HEIGHT = 420;
const MARGIN = { top: 28, right: 24, bottom: 52, left: 68 };
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
const DEFAULT_VISIBLE_SERIES = 8;
const SERIES_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#c026d3",
  "#4f46e5",
  "#65a30d",
  "#d97706",
  "#db2777",
  "#0f766e",
];

type RatingHistoryChartProps = {
  series: RatingHistorySeries[];
  activityType: ActivityType;
  focusPlayerId?: string;
  maxInitialSeries?: number;
};

type XAxisMode = "time" | "sessions";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Berlin",
});

function formatRating(value: number) {
  return value.toFixed(1);
}

function formatDelta(value: number) {
  const rounded = Number(value.toFixed(1));
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

function buildStepPath(
  points: RatingHistoryPoint[],
  xScale: (point: RatingHistoryPoint) => number,
  yScale: (rating: number) => number,
) {
  const orderedPoints = [...points].sort((a, b) => a.order - b.order);
  const first = orderedPoints[0];

  if (!first) {
    return "";
  }

  let path = `M ${xScale(first)} ${yScale(first.rating)}`;

  for (const point of orderedPoints.slice(1)) {
    path += ` H ${xScale(point)} V ${yScale(point.rating)}`;
  }

  return path;
}

function getXAxisTicks(points: RatingHistoryPoint[], mode: XAxisMode, maxTickCount: number) {
  const orderedPoints = [...points].sort((a, b) => a.order - b.order);
  const uniquePoints = [
    ...new Map(
      orderedPoints.map((point) => [mode === "sessions" ? point.sessionId : new Date(point.playedAt).getTime(), point]),
    ).values(),
  ];
  const tickCount = Math.min(maxTickCount, uniquePoints.length);

  if (tickCount <= 1) {
    return uniquePoints;
  }

  return Array.from({ length: tickCount }, (_, index) => {
    const pointIndex = Math.round((index * (uniquePoints.length - 1)) / (tickCount - 1));
    return uniquePoints[pointIndex];
  }).filter((point): point is RatingHistoryPoint => Boolean(point));
}

export function RatingHistoryChart({
  series,
  activityType,
  focusPlayerId,
  maxInitialSeries = DEFAULT_VISIBLE_SERIES,
}: RatingHistoryChartProps) {
  const initialPlayerIds = focusPlayerId
    ? series.filter((entry) => entry.playerId === focusPlayerId).map((entry) => entry.playerId)
    : series.slice(0, maxInitialSeries).map((entry) => entry.playerId);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(() => new Set(initialPlayerIds));
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>("time");
  const [containerWidth, setContainerWidth] = useState(CHART_WIDTH);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const selectedSeries = series.filter((entry) => selectedPlayerIds.has(entry.playerId));
  const selectedPoints = selectedSeries.flatMap((entry) => entry.points);
  const scalePoints = selectedPoints.length > 0 ? selectedPoints : (series[0]?.points ?? []);
  const ratingLabel = activityType === "CARD" ? "OpenSkill" : "Elo";
  const colorByPlayerId = new Map(
    series.map((entry, index) => [entry.playerId, SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0]]),
  );

  useEffect(() => {
    const container = chartContainerRef.current;

    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setContainerWidth(Math.max(MIN_COMPACT_WIDTH, Math.floor(entry.contentRect.width)));
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [selectedSeries.length]);

  function togglePlayer(playerId: string) {
    setSelectedPlayerIds((current) => {
      const next = new Set(current);

      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }

      return next;
    });
  }

  if (series.length === 0) {
    return (
      <div className="app-empty">
        <p className="font-medium text-[var(--text-primary)]">No rating history yet</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Complete {activityType === "CARD" ? "a round" : "a match"} to create the first history point.
        </p>
      </div>
    );
  }

  const allTimes = scalePoints.map((point) => new Date(point.playedAt).getTime());
  const allRatings = scalePoints.map((point) => point.rating);
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const rawMinRating = Math.min(...allRatings);
  const rawMaxRating = Math.max(...allRatings);
  const ratingSpan = Math.max(rawMaxRating - rawMinRating, activityType === "CARD" ? 4 : 20);
  const minRating = rawMinRating - ratingSpan * 0.12;
  const maxRating = rawMaxRating + ratingSpan * 0.12;
  const chartWidth =
    xAxisMode === "sessions"
      ? Math.max(MIN_COMPACT_WIDTH, containerWidth)
      : Math.max(MIN_TIMELINE_WIDTH, containerWidth);
  const plotWidth = chartWidth - MARGIN.left - MARGIN.right;
  const orderedSessionPoints = [
    ...new Map(
      [...scalePoints]
        .sort((a, b) => a.order - b.order)
        .map((point) => [point.sessionId, point]),
    ).values(),
  ];
  const sessionIndexById = new Map(orderedSessionPoints.map((point, index) => [point.sessionId, index]));
  const xScale = (point: RatingHistoryPoint) => {
    if (xAxisMode === "sessions") {
      const sessionIndex = sessionIndexById.get(point.sessionId) ?? 0;
      const lastSessionIndex = Math.max(orderedSessionPoints.length - 1, 0);
      return MARGIN.left + (lastSessionIndex === 0 ? plotWidth / 2 : (sessionIndex / lastSessionIndex) * plotWidth);
    }

    const time = new Date(point.playedAt).getTime();
    return MARGIN.left + (maxTime === minTime ? plotWidth / 2 : ((time - minTime) / (maxTime - minTime)) * plotWidth);
  };
  const yScale = (rating: number) => MARGIN.top + ((maxRating - rating) / (maxRating - minRating)) * PLOT_HEIGHT;
  const yTicks = Array.from({ length: 5 }, (_, index) => minRating + ((maxRating - minRating) * index) / 4).reverse();
  const xTicks = getXAxisTicks(scalePoints, xAxisMode, chartWidth < 520 ? 3 : 5);
  const showPointMarkers = selectedPoints.length <= 160;

  return (
    <div className="space-y-4" data-testid="rating-history-chart">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2" aria-label="Rating history scale">
          <button
            type="button"
            aria-pressed={xAxisMode === "time"}
            className={`app-button ${xAxisMode === "time" ? "app-button-secondary" : "app-button-ghost"}`}
            onClick={() => setXAxisMode("time")}
          >
            Timeline
          </button>
          <button
            type="button"
            aria-pressed={xAxisMode === "sessions"}
            className={`app-button ${xAxisMode === "sessions" ? "app-button-secondary" : "app-button-ghost"}`}
            onClick={() => setXAxisMode("sessions")}
          >
            Sessions
          </button>
        </div>

        {series.length > maxInitialSeries ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="app-button app-button-ghost"
              onClick={() => setSelectedPlayerIds(new Set(series.slice(0, maxInitialSeries).map((entry) => entry.playerId)))}
            >
              Top {Math.min(maxInitialSeries, series.length)}
            </button>
            <button
              type="button"
              className="app-button app-button-ghost"
              onClick={() => setSelectedPlayerIds(new Set(series.map((entry) => entry.playerId)))}
            >
              Show all
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Players shown in rating history">
        {series.map((entry) => {
          const selected = selectedPlayerIds.has(entry.playerId);
          const color = colorByPlayerId.get(entry.playerId) ?? SERIES_COLORS[0];

          return (
            <button
              key={entry.playerId}
              type="button"
              aria-pressed={selected}
              onClick={() => togglePlayer(entry.playerId)}
              className={`app-button ${selected ? "app-button-secondary" : "app-button-ghost"}`}
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
              {entry.playerDisplayName}
            </button>
          );
        })}
      </div>

      {selectedSeries.length === 0 ? (
        <div className="app-empty">
          <p className="font-medium text-[var(--text-primary)]">Select at least one player</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Use the player controls above to display rating history.</p>
        </div>
      ) : (
        <div
          ref={chartContainerRef}
          className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]"
          data-scale-mode={xAxisMode}
        >
          <svg
            viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
            width={chartWidth}
            height={CHART_HEIGHT}
            className="block max-w-none"
            role="img"
            aria-label={`${ratingLabel} rating history`}
          >
            <title>{`${ratingLabel} rating history`}</title>
            <desc>Step chart showing each selected player&apos;s rating after every completed session.</desc>

            {yTicks.map((tick) => {
              const y = yScale(tick);

              return (
                <g key={tick}>
                  <line
                    x1={MARGIN.left}
                    x2={chartWidth - MARGIN.right}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray="4 5"
                  />
                  <text x={MARGIN.left - 12} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="12">
                    {tick.toFixed(0)}
                  </text>
                </g>
              );
            })}

            <text x={MARGIN.left} y={16} fill="var(--text-secondary)" fontSize="12" fontWeight="600">
              {ratingLabel}
            </text>

            {xTicks.map((point) => {
              const x = xScale(point);

              return (
                <g key={`${point.order}-${point.sessionId}`}>
                  <line
                    x1={x}
                    x2={x}
                    y1={MARGIN.top}
                    y2={CHART_HEIGHT - MARGIN.bottom}
                    stroke="var(--border)"
                    opacity="0.35"
                  />
                  <text
                    x={x}
                    y={CHART_HEIGHT - MARGIN.bottom + 24}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="11"
                  >
                    {dateFormatter.format(new Date(point.playedAt))}
                  </text>
                </g>
              );
            })}

            {selectedSeries.map((entry) => {
              const color = colorByPlayerId.get(entry.playerId) ?? SERIES_COLORS[0];

              return (
                <g key={entry.playerId}>
                  <path
                    d={buildStepPath(entry.points, xScale, yScale)}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                  {entry.points.map((point) => (
                    <a key={`${entry.playerId}-${point.sessionId}`} href={`/dashboard/sessions/${point.sessionId}`}>
                      <circle
                        cx={xScale(point)}
                        cy={yScale(point.rating)}
                        r={showPointMarkers ? 4 : 6}
                        fill={showPointMarkers ? "var(--surface)" : "transparent"}
                        stroke={color}
                        strokeWidth={showPointMarkers ? 2.5 : 0}
                      >
                        <title>{`${entry.playerDisplayName} · ${point.sessionTitle ?? "Untitled session"} · ${dateFormatter.format(new Date(point.playedAt))} · ${ratingLabel} ${formatRating(point.rating)} (${formatDelta(point.delta)})`}</title>
                      </circle>
                    </a>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
