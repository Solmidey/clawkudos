import { describe, expect, it } from "vitest";
import { openDatabase } from "../src/store/db.js";
import { PolicyEngine } from "../src/policy/policy.js";
import { recordSuccess } from "../src/store/dedupe.js";

const allowlisted = "0x0000000000000000000000000000000000000001";

describe("PolicyEngine", () => {
  it("blocks non-allowlisted contracts", () => {
    const db = openDatabase(":memory:");
    const policy = new PolicyEngine(db, {
      contractAllowlist: [allowlisted],
      maxMintsPerDay: 2,
      maxMintsPerRun: 2,
      dryRun: false
    });
    const result = policy.canMint("0x0000000000000000000000000000000000000002");
    expect(result.allowed).toBe(false);
  });

  it("honors daily cap", () => {
    const db = openDatabase(":memory:");
    recordSuccess(db, "cast1", "0xhash", "1");
    recordSuccess(db, "cast2", "0xhash", "2");
    const policy = new PolicyEngine(db, {
      contractAllowlist: [allowlisted],
      maxMintsPerDay: 2,
      maxMintsPerRun: 5,
      dryRun: false
    });
    const result = policy.canMint(allowlisted);
    expect(result.allowed).toBe(false);
  });

  it("honors per-run cap", () => {
    const db = openDatabase(":memory:");
    const policy = new PolicyEngine(db, {
      contractAllowlist: [allowlisted],
      maxMintsPerDay: 10,
      maxMintsPerRun: 1,
      dryRun: false
    });
    expect(policy.canMint(allowlisted).allowed).toBe(true);
    policy.recordMintAttempt();
    expect(policy.canMint(allowlisted).allowed).toBe(false);
  });
});
