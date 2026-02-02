import Database from "better-sqlite3";
import { sanitizeText } from "../util/sanitize.js";

export type CastStatus = {
  castHash: string;
  processedAt: number;
  status: "success" | "failed";
  txHash?: string;
  tokenId?: string;
  error?: string;
  retryCount: number;
};

const COOLDOWN_MS = 6 * 60 * 60 * 1000;
const MAX_RETRIES = 3;

export function getCastStatus(db: Database, castHash: string): CastStatus | null {
  const row = db
    .prepare(
      "SELECT cast_hash, processed_at, tx_hash, token_id, status, error, retry_count FROM processed_casts WHERE cast_hash = ?"
    )
    .get(castHash) as CastStatus | undefined;
  if (!row) {
    return null;
  }
  return {
    castHash: row.cast_hash,
    processedAt: row.processed_at,
    status: row.status,
    txHash: row.tx_hash ?? undefined,
    tokenId: row.token_id ?? undefined,
    error: row.error ?? undefined,
    retryCount: row.retry_count ?? 0
  };
}

export function shouldProcessCast(db: Database, castHash: string): boolean {
  const status = getCastStatus(db, castHash);
  if (!status) {
    return true;
  }
  if (status.status === "success") {
    return false;
  }
  const now = Date.now();
  if (status.retryCount >= MAX_RETRIES) {
    return false;
  }
  return now - status.processedAt > COOLDOWN_MS;
}

export function recordSuccess(
  db: Database,
  castHash: string,
  txHash: string,
  tokenId: string
) {
  db.prepare(
    `INSERT INTO processed_casts (cast_hash, processed_at, tx_hash, token_id, status, error, retry_count)
     VALUES (?, ?, ?, ?, 'success', NULL, 0)
     ON CONFLICT(cast_hash) DO UPDATE SET
       processed_at = excluded.processed_at,
       tx_hash = excluded.tx_hash,
       token_id = excluded.token_id,
       status = 'success',
       error = NULL,
       retry_count = 0`
  ).run(castHash, Date.now(), txHash, tokenId);
}

export function recordFailure(db: Database, castHash: string, error: string) {
  const sanitized = sanitizeText(error, 500);
  db.prepare(
    `INSERT INTO processed_casts (cast_hash, processed_at, tx_hash, token_id, status, error, retry_count)
     VALUES (?, ?, NULL, NULL, 'failed', ?, 1)
     ON CONFLICT(cast_hash) DO UPDATE SET
       processed_at = excluded.processed_at,
       status = 'failed',
       error = excluded.error,
       retry_count = processed_casts.retry_count + 1`
  ).run(castHash, Date.now(), sanitized);
}

export function countSuccessesSince(db: Database, sinceMs: number): number {
  const row = db
    .prepare("SELECT COUNT(1) as count FROM processed_casts WHERE status = 'success' AND processed_at >= ?")
    .get(sinceMs) as { count: number };
  return row.count;
}
