import { test, expect } from "../fixtures/smoke-fixture";
import { loginAsForcedPasswordUser } from "../helpers/auth";
import { requireEnv } from "../helpers/env";
import type { Page } from "@playwright/test";

test("@smoke forced password user can update password and reach dashboard", async ({ page }: { page: Page }) => {
  await loginAsForcedPasswordUser(page);

  const currentPassword = requireEnv("E2E_MEMBER_PASSWORD");
  const newPassword = requireEnv("E2E_MEMBER_NEW_PASSWORD");

  await page.getByTestId("security-current-password-input").fill(currentPassword);
  await page.getByTestId("security-new-password-input").fill(newPassword);
  await page.getByTestId("security-confirm-password-input").fill(newPassword);
  await page.getByTestId("security-submit-button").click();

  await expect(page.getByTestId("security-success-message")).toBeVisible();
  await page.getByTestId("force-password-continue-link").click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByTestId("dashboard-heading")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
});
