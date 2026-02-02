import { describe, expect, it } from "vitest";
import { openDatabase } from "../src/store/db.js";
import { recordFailure, recordSuccess, shouldProcessCast } from "../src/store/dedupe.js";

describe("dedupe", () => {
  it("skips successful casts", () => {
    const db = openDatabase(":memory:");
    recordSuccess(db, "cast1", "0xhash", "1");
    expect(shouldProcessCast(db, "cast1")).toBe(false);
  });

  it("allows retry after cooldown", () => {
    const db = openDatabase(":memory:");
    recordFailure(db, "cast2", "error");
    expect(shouldProcessCast(db, "cast2")).toBe(false);
  });
});
