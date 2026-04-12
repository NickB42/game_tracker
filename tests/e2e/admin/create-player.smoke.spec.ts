import { test } from "../fixtures/smoke-fixture";
import { loginAsAdmin } from "../helpers/auth";
import { createPlayerViaUI } from "../helpers/admin-flows";
import type { Page } from "@playwright/test";

test("@smoke admin creates a player", async ({ page, makeName }: { page: Page; makeName: (prefix: string) => string }) => {
  await loginAsAdmin(page);

  const playerName = makeName("E2E Player");
  await createPlayerViaUI(page, playerName);
});
