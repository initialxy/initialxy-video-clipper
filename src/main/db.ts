import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import electron from 'electron';
const { app } = electron;
import fs from 'fs';

let db: DatabaseSync | null = null;

function ensureDbDir(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb(): DatabaseSync {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'settings.db');
  ensureDbDir(dbPath);

  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  return db;
}

export function getSetting(key: string): string | undefined {
  const database = getDb();
  const row = database.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  const database = getDb();
  database.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
