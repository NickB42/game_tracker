import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { groupInputSchema } from "@/lib/validation/group";

describe("group validation", () => {
  it("does not require activity type for create payloads", () => {
    const parsed = groupInputSchema.safeParse({
      name: "Local Squash Group",
      description: "Test group",
      trustedAdminUserIds: [],
    });

    assert.equal(parsed.success, true);
  });

  it("ignores legacy activity type fields", () => {
    const parsed = groupInputSchema.safeParse({
      activityType: "CHESS",
      name: "Activity Agnostic Group",
      description: "",
      trustedAdminUserIds: [],
    });

    assert.equal(parsed.success, true);
  });
});
