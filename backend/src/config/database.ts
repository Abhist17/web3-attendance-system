import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "../../data/attendance.db");

// Ensure data directory exists
import fs from "fs";
const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT UNIQUE NOT NULL,
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    device_fingerprint TEXT,
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
    solana_tx TEXT,
    verified INTEGER DEFAULT 1,
    UNIQUE(student_wallet, lecture_id)
  );

  CREATE TABLE IF NOT EXISTS used_nonces (
    nonce TEXT PRIMARY KEY,
    used_at INTEGER DEFAULT (strftime('%s','now'))
  );
`);

// Clean old nonces every startup (older than 10 minutes)
db.prepare("DELETE FROM used_nonces WHERE used_at < ?").run(
  Math.floor(Date.now() / 1000) - 600
);

export default db;