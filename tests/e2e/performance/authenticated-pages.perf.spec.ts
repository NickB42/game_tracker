import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin } from "../helpers/auth";

type BenchmarkRoute = {
  label: string;
  path: string;
  ready: (page: Page) => Promise<void>;
};

type RouteTimingSummary = {
  route: string;
  samples: number;
  medianMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
};

const routes: BenchmarkRoute[] = [
  {
    label: "dashboard",
    path: "/dashboard",
    ready: async (page) => {
      await expect(page.getByTestId("dashboard-heading")).toBeVisible();
    },
  },
  {
    label: "sessions",
    path: "/dashboard/sessions",
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "Game Sessions" })).toBeVisible();
    },
  },
  {
    label: "groups",
    path: "/dashboard/groups",
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "Groups" })).toBeVisible();
    },
  },
  {
    label: "players",
    path: "/dashboard/players",
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();
    },
  },
  {
    label: "global leaderboard",
    path: "/dashboard/leaderboards/global?activity=CARD",
    ready: async (page) => {
      await expect(page.getByTestId("global-leaderboard-heading")).toBeVisible();
    },
  },
];

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function percentile(sortedValues: number[], percentileValue: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(sortedValues.length - 1, Math.ceil((percentileValue / 100) * sortedValues.length) - 1);
  return sortedValues[index];
}

function summarize(route: string, timings: number[]): RouteTimingSummary {
  const sorted = [...timings].sort((a, b) => a - b);

  return {
    route,
    samples: timings.length,
    medianMs: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    minMs: sorted[0] ?? 0,
    maxMs: sorted[sorted.length - 1] ?? 0,
  };
}

async function measureNavigation(page: Page, route: BenchmarkRoute) {
  const start = performance.now();
  await page.goto(route.path, { waitUntil: "domcontentloaded" });
  await route.ready(page);
  return Math.round(performance.now() - start);
}

test("@perf authenticated dashboard pages benchmark", async ({ page }) => {
  test.setTimeout(180000);

  const iterations = parsePositiveInteger(process.env.PERF_ITERATIONS, 5);
  const warmups = parsePositiveInteger(process.env.PERF_WARMUPS, 1);
  const maxMedianMs = process.env.PERF_MAX_MEDIAN_MS ? parsePositiveInteger(process.env.PERF_MAX_MEDIAN_MS, 0) : undefined;
  const maxP95Ms = process.env.PERF_MAX_P95_MS ? parsePositiveInteger(process.env.PERF_MAX_P95_MS, 0) : undefined;

  await loginAsAdmin(page);

  for (const route of routes) {
    for (let index = 0; index < warmups; index += 1) {
      await measureNavigation(page, route);
    }
  }

  const summaries: RouteTimingSummary[] = [];

  for (const route of routes) {
    const timings: number[] = [];

    for (let index = 0; index < iterations; index += 1) {
      timings.push(await measureNavigation(page, route));
    }

    summaries.push(summarize(route.label, timings));
  }

  console.table(summaries);

  if (maxMedianMs) {
    for (const summary of summaries) {
      expect(summary.medianMs, `${summary.route} median render time`).toBeLessThanOrEqual(maxMedianMs);
    }
  }

  if (maxP95Ms) {
    for (const summary of summaries) {
      expect(summary.p95Ms, `${summary.route} p95 render time`).toBeLessThanOrEqual(maxP95Ms);
    }
  }
});
