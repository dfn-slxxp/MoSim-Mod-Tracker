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

  -- Global key/value store for admin-editable config (steps, themes).
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- One row per Google account that has ever signed in. data JSON:
  -- { displayName, email, photo, instagram, discord, completed, hidden, createdAt }
  CREATE TABLE IF NOT EXISTS profiles (
    uid TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  -- Links a SECONDARY Google account (its sub) to a PRIMARY account, so signing
  -- in with either email lands in the same account/data.
  CREATE TABLE IF NOT EXISTS account_links (
    google_sub  TEXT PRIMARY KEY,
    primary_uid TEXT NOT NULL,
    email       TEXT,
    linked_at   INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS account_links_primary ON account_links(primary_uid);
`);

function getAll(table, uid) {
  return db
    .prepare(`SELECT data FROM ${table} WHERE uid = ? ORDER BY ord, created_at`)
    .all(uid)
    .map((r) => JSON.parse(r.data));
}

/** A single row's data by id alone (no uid check — used for unguessable-id public links). */
function getById(table, id) {
  const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id);
  return row ? JSON.parse(row.data) : null;
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

function getProfile(uid) {
  const row = db.prepare('SELECT data FROM profiles WHERE uid = ?').get(uid);
  return row ? JSON.parse(row.data) : null;
}

function setProfile(uid, data) {
  db.prepare(
    'INSERT INTO profiles (uid, data) VALUES (?, ?) ON CONFLICT(uid) DO UPDATE SET data = excluded.data'
  ).run(uid, JSON.stringify(data));
}

function allProfiles() {
  return db.prepare('SELECT uid, data FROM profiles').all()
    .map((r) => ({ uid: r.uid, ...JSON.parse(r.data) }));
}

/** Every robot row across all users (for public robot counts). */
function allRobots() {
  return db.prepare('SELECT uid, data FROM robots').all()
    .map((r) => ({ uid: r.uid, ...JSON.parse(r.data) }));
}

/** Every modpack row across all users (for the public /packs showcase). */
function allModpacks() {
  return db.prepare('SELECT uid, data FROM modpacks').all()
    .map((r) => ({ uid: r.uid, ...JSON.parse(r.data) }));
}

// ── Account linking ───────────────────────────────────────────────────────────

/** Resolve a Google sub to its primary account uid (itself if unlinked). */
function resolveUid(sub) {
  const row = db.prepare('SELECT primary_uid FROM account_links WHERE google_sub = ?').get(sub);
  return row?.primary_uid ?? sub;
}

function linkAccount(sub, primaryUid, email) {
  db.prepare(
    `INSERT INTO account_links (google_sub, primary_uid, email, linked_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(google_sub) DO UPDATE SET primary_uid = excluded.primary_uid, email = excluded.email`
  ).run(sub, primaryUid, email ?? null, Date.now());
}

/** Secondary accounts linked TO this primary uid. */
function linkedAccounts(primaryUid) {
  return db.prepare('SELECT google_sub AS sub, email FROM account_links WHERE primary_uid = ?').all(primaryUid);
}

function unlinkAccount(sub, primaryUid) {
  const info = db.prepare('DELETE FROM account_links WHERE google_sub = ? AND primary_uid = ?').run(sub, primaryUid);
  return info.changes > 0;
}

/**
 * Move ALL of one account's data onto another, so linked accounts share a
 * combined list. Robot/modpack/repo/script ids are UUIDs (no collisions);
 * moved rows are re-ordered to append after the target's existing items, and
 * their ownerUid is rewritten. The source profile is dropped (its identity now
 * lives in account_links). Runs in a single transaction.
 */
function mergeAccounts(fromUid, toUid) {
  if (!fromUid || !toUid || fromUid === toUid) return;
  const tables = ['robots', 'modpacks', 'repos', 'scripts'];
  const tx = db.transaction(() => {
    for (const table of tables) {
      const maxRow = db.prepare(`SELECT MAX(ord) AS m FROM ${table} WHERE uid = ?`).get(toUid);
      const offset = maxRow?.m ?? 0;
      const rows = db.prepare(`SELECT id, data, ord FROM ${table} WHERE uid = ?`).all(fromUid);
      for (const r of rows) {
        const data = JSON.parse(r.data);
        data.ownerUid = toUid;
        const newOrd = offset + (r.ord ?? 0) + 1;
        data.order = newOrd;
        db.prepare(`UPDATE ${table} SET uid = ?, data = ?, ord = ? WHERE id = ?`)
          .run(toUid, JSON.stringify(data), newOrd, r.id);
      }
    }
    // Any accounts linked to the old account now point at the new primary.
    db.prepare('UPDATE account_links SET primary_uid = ? WHERE primary_uid = ?').run(toUid, fromUid);
    db.prepare('DELETE FROM profiles WHERE uid = ?').run(fromUid);
  });
  tx();
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : null;
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, JSON.stringify(value));
}

module.exports = {
  db, getAll, getById, insert, update, remove, getSetting, setSetting,
  getProfile, setProfile, allProfiles, allRobots, allModpacks,
  resolveUid, linkAccount, linkedAccounts, unlinkAccount, mergeAccounts,
};
