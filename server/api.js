'use strict';
const { Router } = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { db, getAll, insert, update, remove } = require('./db');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !JWT_SECRET) {
  console.error(
    'Missing required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,\n' +
    'OAUTH_REDIRECT_URI, JWT_SECRET\n' +
    'Copy server/.env.example to server/.env and fill it in.'
  );
  process.exit(1);
}

const oauth = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// ── Auth helpers ──────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('session', { path: '/' });
    res.status(401).json({ error: 'Session expired — sign in again' });
  }
}

function setSession(res, user) {
  const token = jwt.sign(
    { uid: user.uid, name: user.name, email: user.email, photo: user.photo ?? null },
    JWT_SECRET,
    { expiresIn: JWT_TTL }
  );
  res.cookie('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: JWT_TTL * 1000,
    path: '/'
  });
}

// ── Generic CRUD factory ──────────────────────────────────────────────────────

function crud(table, { onDelete } = {}) {
  const r = Router();

  r.get('/', requireAuth, (req, res) => {
    res.json(getAll(table, req.user.uid));
  });

  r.post('/', requireAuth, (req, res) => {
    const id = insert(table, req.user.uid, req.body);
    res.status(201).json({ id });
  });

  r.put('/:id', requireAuth, (req, res) => {
    try {
      update(table, req.user.uid, req.params.id, req.body);
      res.json({ ok: true });
    } catch (e) {
      res.status(e.status ?? 500).json({ error: e.message });
    }
  });

  r.delete('/:id', requireAuth, (req, res) => {
    const uid = req.user.uid;
    try {
      onDelete?.(uid, req.params.id);
      remove(table, uid, req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(e.status ?? 500).json({ error: e.message });
    }
  });

  return r;
}

// ── Main router ───────────────────────────────────────────────────────────────

const router = Router();

// ── Google OAuth ──────────────────────────────────────────────────────────────

router.get('/auth/login', (_req, res) => {
  // Sign a short-lived state token for CSRF protection.
  const state = jwt.sign({ csrf: 1 }, JWT_SECRET, { expiresIn: 600 });
  const url = oauth.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state
  });
  res.redirect(url);
});

router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!state || !code) return res.status(400).send('Missing OAuth parameters');
    jwt.verify(String(state), JWT_SECRET); // CSRF check

    const { tokens } = await oauth.getToken(String(code));
    const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: CLIENT_ID });
    const p = ticket.getPayload();

    setSession(res, {
      uid: p.sub,
      name: p.name ?? p.email,
      email: p.email,
      photo: p.picture ?? null
    });
    res.redirect('/#/');
  } catch (e) {
    res.status(400).send('Sign-in failed: ' + e.message);
  }
});

router.post('/auth/logout', (_req, res) => {
  res.clearCookie('session', { path: '/' });
  res.json({ ok: true });
});

// ── Current user ──────────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  const { uid, name, email, photo } = req.user;
  res.json({ uid, name, email, photo });
});

// ── Bulk data (one request to initialise the whole app) ───────────────────────

router.get('/data', requireAuth, (req, res) => {
  const { uid } = req.user;
  res.json({
    robots:   getAll('robots',   uid),
    modpacks: getAll('modpacks', uid),
    repos:    getAll('repos',    uid),
    scripts:  getAll('scripts',  uid)
  });
});

// ── Robots ────────────────────────────────────────────────────────────────────

router.use('/robots', crud('robots'));

// Move a robot into/out of a modpack (updates modpackPrivate too)
router.post('/robots/:id/modpack', requireAuth, (req, res) => {
  const uid = req.user.uid;
  const { modpackId } = req.body;
  try {
    let modpackPrivate = false;
    if (modpackId) {
      const row = db.prepare('SELECT data FROM modpacks WHERE id = ? AND uid = ?').get(modpackId, uid);
      if (row) modpackPrivate = JSON.parse(row.data).private ?? false;
    }
    update('robots', uid, req.params.id, { modpackId: modpackId ?? null, modpackPrivate });
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

// ── Modpacks ──────────────────────────────────────────────────────────────────

router.use('/modpacks', crud('modpacks', {
  // When a modpack is deleted, detach all its member robots
  onDelete(uid, modpackId) {
    const rows = db.prepare('SELECT id, data FROM robots WHERE uid = ?').all(uid);
    for (const row of rows) {
      if (JSON.parse(row.data).modpackId === modpackId) {
        update('robots', uid, row.id, { modpackId: null, modpackPrivate: false });
      }
    }
  }
}));

// Toggle a modpack's privacy flag and sync the denormalized flag to member robots
router.post('/modpacks/:id/privacy', requireAuth, (req, res) => {
  const uid = req.user.uid;
  const isPrivate = !!req.body.isPrivate;
  try {
    update('modpacks', uid, req.params.id, { private: isPrivate });
    const rows = db.prepare('SELECT id, data FROM robots WHERE uid = ?').all(uid);
    for (const row of rows) {
      if (JSON.parse(row.data).modpackId === req.params.id) {
        update('robots', uid, row.id, { modpackPrivate: isPrivate });
      }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

// ── Repos ─────────────────────────────────────────────────────────────────────

router.use('/repos', crud('repos', {
  // When a repo is deleted, detach all robots that referenced it
  onDelete(uid, repoId) {
    const rows = db.prepare('SELECT id, data FROM robots WHERE uid = ?').all(uid);
    for (const row of rows) {
      if (JSON.parse(row.data).repoId === repoId) {
        update('robots', uid, row.id, { repoId: null });
      }
    }
  }
}));

// ── Scripts ───────────────────────────────────────────────────────────────────

router.use('/scripts', crud('scripts'));

module.exports = router;
