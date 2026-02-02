import Database from "better-sqlite3";

export function openDatabase(path: string) {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS processed_casts (
      cast_hash TEXT PRIMARY KEY,
      processed_at INTEGER NOT NULL,
      tx_hash TEXT,
      token_id TEXT,
      status TEXT NOT NULL,
      error TEXT,
      retry_count INTEGER DEFAULT 0
    );
  `);
  return db;
}
