import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { RatingHistoryChart } from "@/components/leaderboards/rating-history-chart";

describe("RatingHistoryChart", () => {
  it("renders an empty state without rating events", () => {
    const markup = renderToStaticMarkup(
      createElement(RatingHistoryChart, {
        series: [],
        activityType: "SQUASH",
      }),
    );

    assert(markup.includes("No rating history yet"));
  });

  it("renders player controls, a step chart, and session links", () => {
    const markup = renderToStaticMarkup(
      createElement(RatingHistoryChart, {
        activityType: "SQUASH",
        series: [
          {
            playerId: "player-1",
            playerDisplayName: "Alice",
            points: [
              {
                sessionId: "session-1",
                sessionTitle: "Monday squash",
                playedAt: "2026-01-01T10:00:00.000Z",
                sequenceNumber: 1,
                order: 0,
                rating: 1516,
                delta: 16,
              },
              {
                sessionId: "session-2",
                sessionTitle: "Friday squash",
                playedAt: "2026-01-05T10:00:00.000Z",
                sequenceNumber: 1,
                order: 1,
                rating: 1530,
                delta: 14,
              },
            ],
          },
          {
            playerId: "player-2",
            playerDisplayName: "Bob",
            points: [
              {
                sessionId: "session-1",
                sessionTitle: "Monday squash",
                playedAt: "2026-01-01T10:00:00.000Z",
                sequenceNumber: 1,
                order: 0,
                rating: 1484,
                delta: -16,
              },
            ],
          },
        ],
      }),
    );

    assert(markup.includes('data-testid="rating-history-chart"'));
    assert(markup.includes("Alice"));
    assert(markup.includes("Elo rating history"));
    assert(markup.includes("Monday squash"));
    assert(markup.includes('/dashboard/sessions/session-1'));
    assert(markup.includes("#2563eb"));
    assert(markup.includes("#dc2626"));
    assert(!markup.includes("One point per session"));
  });
});
