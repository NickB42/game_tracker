import { test, expect } from "../fixtures/smoke-fixture";
import { loginAsAdmin } from "../helpers/auth";
import { createPlayerViaUI, createSessionViaUI, createSquashMatchViaUI } from "../helpers/admin-flows";
import type { Page } from "@playwright/test";

test("@smoke leaderboard activity isolation prevents cross-activity leakage", async ({ page, makeName }: { page: Page; makeName: (prefix: string) => string }) => {
  await loginAsAdmin(page);

  const cardP1 = makeName("E2E Card Iso P1");
  const cardP2 = makeName("E2E Card Iso P2");
  const squashP1 = makeName("E2E Squash Iso P1");
  const squashP2 = makeName("E2E Squash Iso P2");

  await createPlayerViaUI(page, cardP1);
  await createPlayerViaUI(page, cardP2);
  await createPlayerViaUI(page, squashP1);
  await createPlayerViaUI(page, squashP2);

  await createSessionViaUI(page, makeName("E2E Card Iso Session"), [cardP1, cardP2], { activityType: "CARD" });
  await page.getByTestId("session-add-round-link").click();
  await expect(page.getByTestId("round-form")).toBeVisible();
  await page.getByTestId("round-position-select-1").selectOption({ label: cardP1 });
  await page.getByTestId("round-position-select-2").selectOption({ label: cardP2 });
  await page.getByTestId("round-submit-button").click();

  await createSessionViaUI(page, makeName("E2E Squash Iso Session"), [squashP1, squashP2], { activityType: "SQUASH" });
  await createSquashMatchViaUI(page, [squashP1, squashP2], [11, 7]);

  await page.goto("/dashboard/leaderboards/global?activity=CARD");
  await expect(page.getByTestId("leaderboard-table")).toContainText(cardP1);
  await expect(page.getByTestId("leaderboard-table")).toContainText(cardP2);
  await expect(page.getByTestId("leaderboard-table")).not.toContainText(squashP1);
  await expect(page.getByTestId("leaderboard-table")).not.toContainText(squashP2);

  await page.goto("/dashboard/leaderboards/global?activity=SQUASH");
  await expect(page.getByTestId("leaderboard-table")).toContainText(squashP1);
  await expect(page.getByTestId("leaderboard-table")).toContainText(squashP2);
  await expect(page.getByTestId("leaderboard-table")).not.toContainText(cardP1);
  await expect(page.getByTestId("leaderboard-table")).not.toContainText(cardP2);
});
