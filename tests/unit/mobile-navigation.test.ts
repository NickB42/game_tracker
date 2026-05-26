import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("mobile navigation", () => {
  it("uses an opaque full-width bottom bar", async () => {
    const source = await readFile("app/globals.css", "utf8");

    assert(source.includes(".app-mobile-tabs"));
    assert(source.includes("right: 0;"));
    assert(source.includes("bottom: -1px;"));
    assert(source.includes("left: 0;"));
    assert(source.includes("background: var(--bg-elevated);"));
  });
});
