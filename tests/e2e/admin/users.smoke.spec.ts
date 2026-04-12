import { test, expect } from "../fixtures/smoke-fixture";
import { loginAsAdmin } from "../helpers/auth";
import type { Page } from "@playwright/test";

test("@smoke admin users page loads", async ({ page }: { page: Page }) => {
  await loginAsAdmin(page);

  await page.goto("/dashboard/admin/users");
  await expect(page.getByTestId("admin-users-heading")).toBeVisible();
  await expect(page.getByTestId("admin-users-table")).toBeVisible();
});
