import { test, expect } from "../fixtures/smoke-fixture";
import { loginAsAdmin } from "../helpers/auth";
import type { Page } from "@playwright/test";

test("@smoke admin login redirects to dashboard", async ({ page }: { page: Page }) => {
  await loginAsAdmin(page);
  await expect(page.getByTestId("dashboard-auth-shell")).toBeVisible();
});
