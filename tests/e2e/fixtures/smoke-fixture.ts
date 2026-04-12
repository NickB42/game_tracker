import { test as base } from "@playwright/test";

import { uniqueName } from "../helpers/data";

type SmokeFixtures = {
  makeName: (prefix: string) => string;
};

export const test = base.extend<SmokeFixtures>({
  makeName: async ({}, applyFixture) => {
    await applyFixture((prefix: string) => uniqueName(prefix));
  },
});

export { expect } from "@playwright/test";
