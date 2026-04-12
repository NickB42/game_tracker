import { test, expect } from "../fixtures/smoke-fixture";
import { loginAsAdmin } from "../helpers/auth";
import { createPlayerViaUI, createSessionViaUI } from "../helpers/admin-flows";
import type { Page } from "@playwright/test";

test("@smoke admin creates a session", async ({ page, makeName }: { page: Page; makeName: (prefix: string) => string }) => {
  await loginAsAdmin(page);

  const playerOne = makeName("E2E Session P1");
  const playerTwo = makeName("E2E Session P2");
  const sessionTitle = makeName("E2E Session");

  await createPlayerViaUI(page, playerOne);
  await createPlayerViaUI(page, playerTwo);
  await createSessionViaUI(page, sessionTitle, [playerOne, playerTwo]);
});

test("@smoke admin records one ranked round", async ({ page, makeName }: { page: Page; makeName: (prefix: string) => string }) => {
  await loginAsAdmin(page);

  const playerOne = makeName("E2E Round P1");
  const playerTwo = makeName("E2E Round P2");
  const sessionTitle = makeName("E2E Round Session");

  await createPlayerViaUI(page, playerOne);
  await createPlayerViaUI(page, playerTwo);
  await createSessionViaUI(page, sessionTitle, [playerOne, playerTwo]);

  await page.getByTestId("session-add-round-link").click();
  await expect(page.getByTestId("round-form")).toBeVisible();

  await page.getByTestId("round-position-select-1").selectOption({ label: playerOne });
  await page.getByTestId("round-position-select-2").selectOption({ label: playerTwo });
  await page.getByTestId("round-submit-button").click();

  await expect(page).toHaveURL(/\/dashboard\/sessions\/.+/);
  await expect(page.getByTestId("session-rounds-section")).toContainText("Round #1");
});
