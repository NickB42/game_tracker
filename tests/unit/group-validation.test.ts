import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { groupInputSchema } from "@/lib/validation/group";

describe("group validation", () => {
  it("requires activity type for create payloads", () => {
    const parsed = groupInputSchema.safeParse({
      name: "Local Squash Group",
      description: "Test group",
      trustedAdminUserIds: [],
    });

    assert.equal(parsed.success, false);
  });

  it("accepts supported activity types", () => {
    const supported = ["CARD", "SQUASH", "PADEL"] as const;

    for (const activityType of supported) {
      const parsed = groupInputSchema.safeParse({
        activityType,
        name: `Group ${activityType}`,
        description: "",
        trustedAdminUserIds: [],
      });

      assert.equal(parsed.success, true);
    }
  });

  it("rejects unknown activity types", () => {
    const parsed = groupInputSchema.safeParse({
      activityType: "CHESS",
      name: "Invalid Group",
      description: "",
      trustedAdminUserIds: [],
    });

    assert.equal(parsed.success, false);
  });
});
