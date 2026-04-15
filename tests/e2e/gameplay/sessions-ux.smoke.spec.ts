import { test, expect } from "../fixtures/smoke-fixture";
import { loginAsAdmin } from "../helpers/auth";
import { createPlayerViaUI, createSessionViaUI } from "../helpers/admin-flows";
import type { Page } from "@playwright/test";

test("@smoke sessions list filter persistence and quick create", async ({ page, makeName }: { page: Page; makeName: (prefix: string) => string }) => {
  await loginAsAdmin(page);

  const playerOne = makeName("E2E UX P1");
  const playerTwo = makeName("E2E UX P2");

  await createPlayerViaUI(page, playerOne);
  await createPlayerViaUI(page, playerTwo);

  await page.goto("/dashboard/sessions?activity=SQUASH");
  await expect(page.getByTestId("sessions-activity-filter-squash")).toBeVisible();

  await page.getByTestId("sessions-quick-create").click();
  await expect(page).toHaveURL(/\/dashboard\/sessions\/new\?activity=SQUASH/);
  await expect(page.getByLabel("Activity", { exact: true })).toHaveValue("SQUASH");

  const sessionTitle = makeName("E2E UX Squash Session");
  await page.getByTestId("session-title-input").fill(sessionTitle);
  await page.getByLabel(playerOne, { exact: true }).check();
  await page.getByLabel(playerTwo, { exact: true }).check();
  await page.getByTestId("session-submit-button").click();

  await expect(page).toHaveURL(/\/dashboard\/sessions\/.+/);
  await page.getByRole("link", { name: "Back to Sessions" }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/sessions\?activity=SQUASH/);
});

test("@smoke session detail activity context visibility", async ({ page, makeName }: { page: Page; makeName: (prefix: string) => string }) => {
  await loginAsAdmin(page);

  const p1 = makeName("E2E Detail P1");
  const p2 = makeName("E2E Detail P2");
  const p3 = makeName("E2E Detail P3");
  const p4 = makeName("E2E Detail P4");
  const sessionTitle = makeName("E2E Detail Session");

  await createPlayerViaUI(page, p1);
  await createPlayerViaUI(page, p2);
  await createPlayerViaUI(page, p3);
  await createPlayerViaUI(page, p4);
  await createSessionViaUI(page, sessionTitle, [p1, p2, p3, p4], { activityType: "PADEL" });

  await expect(page.getByText("Recorded matches")).toBeVisible();
  await expect(page.getByRole("link", { name: "Global Leaderboard" })).toHaveAttribute("href", /activity=PADEL/);
});
