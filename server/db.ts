import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'wander-island.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      created_at INTEGER DEFAULT (unixepoch()),
      last_online INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS islands (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_public INTEGER DEFAULT 1,
      data TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friends (
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, friend_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      read INTEGER DEFAULT 0,
      FOREIGN KEY (from_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_islands_owner ON islands(owner_id);
    CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
    CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);
    CREATE INDEX IF NOT EXISTS idx_chat_from ON chat_messages(from_id);
    CREATE INDEX IF NOT EXISTS idx_chat_to ON chat_messages(to_id);
  `);
}

export default getDb;
