import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildNewSessionHref,
  buildSessionsHref,
  buildSessionsQueryString,
  parseSessionsActivityFilter,
} from "@/lib/sessions/filter-state";

describe("session filter state utilities", () => {
  it("parses known activities and falls back to ALL", () => {
    assert.equal(parseSessionsActivityFilter("CARD"), "CARD");
    assert.equal(parseSessionsActivityFilter("SQUASH"), "SQUASH");
    assert.equal(parseSessionsActivityFilter("PADEL"), "PADEL");
    assert.equal(parseSessionsActivityFilter("unknown"), "ALL");
    assert.equal(parseSessionsActivityFilter(undefined), "ALL");
  });

  it("builds stable query strings", () => {
    assert.equal(buildSessionsQueryString({ activity: "ALL" }), "");
    assert.equal(buildSessionsQueryString({ activity: "CARD" }), "activity=CARD");
    assert.equal(buildSessionsQueryString({ activity: "SQUASH", groupId: "g1" }), "activity=SQUASH&groupId=g1");
  });

  it("builds list and new-session hrefs", () => {
    assert.equal(buildSessionsHref({ activity: "ALL" }), "/dashboard/sessions");
    assert.equal(buildSessionsHref({ activity: "PADEL", groupId: "g2" }), "/dashboard/sessions?activity=PADEL&groupId=g2");

    assert.equal(buildNewSessionHref({ activity: "ALL" }), "/dashboard/sessions/new");
    assert.equal(buildNewSessionHref({ activity: "CARD", groupId: "g3" }), "/dashboard/sessions/new?activity=CARD&groupId=g3");
  });
});
