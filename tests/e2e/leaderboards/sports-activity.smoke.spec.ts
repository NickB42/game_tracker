import { test, expect } from "../fixtures/smoke-fixture";
import { loginAsAdmin } from "../helpers/auth";
import { createPlayerViaUI, createSessionViaUI, createSquashMatchViaUI, createPadelMatchViaUI } from "../helpers/admin-flows";
import type { Page } from "@playwright/test";

test("@smoke squash leaderboard updates after match creation", async ({ page, makeName }: { page: Page; makeName: (prefix: string) => string }) => {
  await loginAsAdmin(page);

  const playerOne = makeName("E2E Squash P1");
  const playerTwo = makeName("E2E Squash P2");
  const sessionTitle = makeName("E2E Squash Session");

  await createPlayerViaUI(page, playerOne);
  await createPlayerViaUI(page, playerTwo);

  await createSessionViaUI(page, sessionTitle, [playerOne, playerTwo], { activityType: "SQUASH" });
  await createSquashMatchViaUI(page, [playerOne, playerTwo], [11, 8]);

  await page.goto("/dashboard/leaderboards/global?activity=SQUASH");
  await expect(page.getByTestId("leaderboard-table")).toContainText(playerOne);
  await expect(page.getByTestId("leaderboard-table")).toContainText(playerTwo);
});

test("@smoke padel leaderboard updates after match creation", async ({ page, makeName }: { page: Page; makeName: (prefix: string) => string }) => {
  await loginAsAdmin(page);

  const p1 = makeName("E2E Padel P1");
  const p2 = makeName("E2E Padel P2");
  const p3 = makeName("E2E Padel P3");
  const p4 = makeName("E2E Padel P4");
  const sessionTitle = makeName("E2E Padel Session");

  await createPlayerViaUI(page, p1);
  await createPlayerViaUI(page, p2);
  await createPlayerViaUI(page, p3);
  await createPlayerViaUI(page, p4);

  await createSessionViaUI(page, sessionTitle, [p1, p2, p3, p4], { activityType: "PADEL" });
  await createPadelMatchViaUI(page, [p1, p2], [p3, p4], [
    [6, 4],
    [6, 3],
  ]);

  await page.goto("/dashboard/leaderboards/global?activity=PADEL");
  await expect(page.getByTestId("leaderboard-table")).toContainText(p1);
  await expect(page.getByTestId("leaderboard-table")).toContainText(p4);
});
