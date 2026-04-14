import { test, expect } from "../fixtures/smoke-fixture";
import { loginAsAdmin } from "../helpers/auth";
import type { Page } from "@playwright/test";

test("@smoke global leaderboard page loads", async ({ page }: { page: Page }) => {
  await loginAsAdmin(page);

  await page.goto("/dashboard/leaderboards/global?activity=CARD");
  await expect(page.getByTestId("global-leaderboard-heading")).toBeVisible();
  await expect(page.getByText("Card", { exact: true })).toBeVisible();

  const emptyState = page.getByTestId("leaderboard-empty-state");
  const table = page.getByTestId("leaderboard-table");

  await expect(emptyState.or(table)).toBeVisible();
});
