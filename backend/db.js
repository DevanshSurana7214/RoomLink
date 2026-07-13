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

    CREATE TABLE IF NOT EXISTS swap_requests (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL REFERENCES people(id),
      target_person_id TEXT NOT NULL REFERENCES people(id),
      requester_room TEXT NOT NULL,
      target_room TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'cancelled')),
      created_at TEXT NOT NULL,
      responded_at TEXT
    );

    CREATE TABLE IF NOT EXISTS saved_searches (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id),
      target_rooms TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'watching' CHECK(status IN ('watching', 'found', 'cancelled')),
      created_at TEXT NOT NULL,
      found_at TEXT,
      last_result TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_connections_people ON connections(person_a_id, person_b_id);
    CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
    CREATE INDEX IF NOT EXISTS idx_swap_requests_requester ON swap_requests(requester_id);
    CREATE INDEX IF NOT EXISTS idx_swap_requests_target ON swap_requests(target_person_id);
    CREATE INDEX IF NOT EXISTS idx_swap_requests_status ON swap_requests(status);
    CREATE INDEX IF NOT EXISTS idx_saved_searches_person ON saved_searches(person_id);
    CREATE INDEX IF NOT EXISTS idx_saved_searches_status ON saved_searches(status);
  `);

  // Add columns if upgrading from old schema
  // (outside the db.exec() so we can use JS try/catch)
  try {
    db.exec("ALTER TABLE people ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''");
  } catch (_e) {
    // Column already exists — no action needed
  }
  try {
    db.exec("ALTER TABLE people ADD COLUMN previous_room TEXT");
  } catch (_e) {
    // Column already exists — no action needed
  }
}

module.exports = { getDb };
