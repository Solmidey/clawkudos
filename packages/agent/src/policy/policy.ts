import { isAddress } from "viem";
import { countSuccessesSince } from "../store/dedupe.js";
import Database from "better-sqlite3";

export type PolicyConfig = {
  contractAllowlist: string[];
  maxMintsPerDay: number;
  maxMintsPerRun: number;
  dryRun: boolean;
};

export class PolicyEngine {
  private runMints = 0;

  constructor(private db: Database, private config: PolicyConfig) {}

  canMint(contractAddress: string) {
    if (!this.config.contractAllowlist.includes(contractAddress.toLowerCase())) {
      return { allowed: false, reason: "Contract not allowlisted" };
    }
    if (!isAddress(contractAddress)) {
      return { allowed: false, reason: "Invalid contract address" };
    }
    if (this.config.dryRun) {
      return { allowed: false, reason: "Dry run enabled" };
    }
    const dayStart = Date.now() - 24 * 60 * 60 * 1000;
    const dailyCount = countSuccessesSince(this.db, dayStart);
    if (dailyCount >= this.config.maxMintsPerDay) {
      return { allowed: false, reason: "Daily mint cap reached" };
    }
    if (this.runMints >= this.config.maxMintsPerRun) {
      return { allowed: false, reason: "Per-run mint cap reached" };
    }
    return { allowed: true } as const;
  }

  recordMintAttempt() {
    this.runMints += 1;
  }
}
