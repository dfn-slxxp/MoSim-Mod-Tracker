'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS robots (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    data TEXT NOT NULL,
    ord REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS robots_uid ON robots(uid);

  CREATE TABLE IF NOT EXISTS modpacks (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    data TEXT NOT NULL,
    ord REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS modpacks_uid ON modpacks(uid);

  CREATE TABLE IF NOT EXISTS repos (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    data TEXT NOT NULL,
    ord REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS repos_uid ON repos(uid);

  CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    data TEXT NOT NULL,
    ord REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS scripts_uid ON scripts(uid);
`);

function getAll(table, uid) {
  return db
    .prepare(`SELECT data FROM ${table} WHERE uid = ? ORDER BY ord, created_at`)
    .all(uid)
    .map((r) => JSON.parse(r.data));
}

function nextOrd(table, uid) {
  const row = db.prepare(`SELECT MAX(ord) AS m FROM ${table} WHERE uid = ?`).get(uid);
  return (row?.m ?? 0) + 1;
}

function insert(table, uid, data) {
  const id = crypto.randomUUID();
  const now = Date.now();
  const ord = 'order' in data ? Number(data.order) : nextOrd(table, uid);
  const doc = { ...data, id, ownerUid: uid, order: ord, createdAt: now };
  db.prepare(`INSERT INTO ${table} (id, uid, data, ord, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run(id, uid, JSON.stringify(doc), ord, now);
  return id;
}

function update(table, uid, id, patch) {
  const row = db.prepare(`SELECT data FROM ${table} WHERE id = ? AND uid = ?`).get(id, uid);
  if (!row) throw Object.assign(new Error('Not found'), { status: 404 });
  // Strip immutable fields from patch so callers can pass the whole object
  const { id: _id, ownerUid: _uid, createdAt: _ts, ...rest } = patch;
  const updated = { ...JSON.parse(row.data), ...rest };
  db.prepare(`UPDATE ${table} SET data = ?, ord = ? WHERE id = ? AND uid = ?`)
    .run(JSON.stringify(updated), updated.order ?? 0, id, uid);
}

function remove(table, uid, id) {
  const info = db.prepare(`DELETE FROM ${table} WHERE id = ? AND uid = ?`).run(id, uid);
  if (info.changes === 0) throw Object.assign(new Error('Not found'), { status: 404 });
}

module.exports = { db, getAll, insert, update, remove };
