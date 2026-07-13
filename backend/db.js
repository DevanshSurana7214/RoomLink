const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'roomlink.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      roll_number TEXT UNIQUE NOT NULL,
      room_no TEXT NOT NULL,
      password_hash TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      person_a_id TEXT NOT NULL REFERENCES people(id),
      person_b_id TEXT NOT NULL REFERENCES people(id),
      a_to_b_consent INTEGER NOT NULL DEFAULT 0,
      b_to_a_consent INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed')),
      requested_by TEXT NOT NULL CHECK(requested_by IN ('a', 'b')),
      UNIQUE(person_a_id, person_b_id)
    );

    CREATE INDEX IF NOT EXISTS idx_connections_people ON connections(person_a_id, person_b_id);
    CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
  `);

  // Add password_hash column if upgrading from old schema
  // This is outside the db.exec() call so we can use JS try/catch
  try {
    db.exec("ALTER TABLE people ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''");
  } catch (_e) {
    // Column already exists on fresh database — no action needed
  }
}

module.exports = { getDb };
