import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "attendance.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT UNIQUE NOT NULL,
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    device_fingerprint TEXT,
    solana_tx TEXT,
    registered_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS lectures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lecture_id TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    professor_wallet TEXT NOT NULL,
    classroom_lat REAL,
    classroom_lng REAL,
    start_time INTEGER NOT NULL,
    deadline INTEGER NOT NULL,
    solana_tx TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_wallet TEXT NOT NULL,
    lecture_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    device_fingerprint TEXT,
    student_lat REAL,
    student_lng REAL,
    distance_meters REAL,
    solana_tx TEXT,
    verified INTEGER DEFAULT 1,
    UNIQUE(student_wallet, lecture_id)
  );

  CREATE INDEX IF NOT EXISTS idx_attendance_lecture ON attendance(lecture_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_wallet);
  CREATE INDEX IF NOT EXISTS idx_lectures_professor ON lectures(professor_wallet);
`);

/**
 * The QR code is broadcast to a whole room, so a nonce cannot be globally
 * single-use — the first scanner would lock everyone else out. It is scoped per
 * wallet instead: each student may redeem a given code exactly once.
 *
 * The original schema keyed this table on `nonce` alone. Rebuild it when that
 * older shape is detected; the rows are throwaway (they expire within a minute).
 */
const nonceColumns = db
  .prepare("PRAGMA table_info(used_nonces)")
  .all() as { name: string }[];

if (nonceColumns.length > 0 && !nonceColumns.some((c) => c.name === "student_wallet")) {
  db.exec("DROP TABLE used_nonces");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS used_nonces (
    nonce TEXT NOT NULL,
    student_wallet TEXT NOT NULL,
    used_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    PRIMARY KEY (nonce, student_wallet)
  );

  CREATE INDEX IF NOT EXISTS idx_nonces_used_at ON used_nonces(used_at);
`);

/** Older databases predate these columns; add them if they are missing. */
function ensureColumn(table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn("students", "solana_tx", "TEXT");
ensureColumn("lectures", "solana_tx", "TEXT");
ensureColumn("attendance", "distance_meters", "REAL");

export function purgeExpiredNonces(maxAgeSeconds = 600): void {
  db.prepare("DELETE FROM used_nonces WHERE used_at < ?").run(
    Math.floor(Date.now() / 1000) - maxAgeSeconds
  );
}

purgeExpiredNonces();

export default db;
