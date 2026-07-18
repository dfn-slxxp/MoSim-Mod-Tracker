'use strict';
const { Router } = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { db, getAll, insert, update, remove, getSetting, setSetting } = require('./db');

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = process.env.OAUTH_REDIRECT_URI;
const JWT_SECRET    = process.env.JWT_SECRET;
const JWT_TTL       = 30 * 24 * 60 * 60; // 30 days in seconds

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !JWT_SECRET) {
  console.error(
    'Missing required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,\n' +
    'OAUTH_REDIRECT_URI, JWT_SECRET\n' +
    'Copy server/.env.example to server/.env and fill it in.'
  );
  process.exit(1);
}

const oauth = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// ── CORS for the Tauri desktop client ────────────────────────────────────────
// The Tauri webview origin is tauri://localhost (macOS) or
// http://tauri.localhost (Windows / Linux). Regular browser clients hit the
// same origin as the server, so no CORS headers are needed for them.

const TAURI_ORIGINS = new Set([
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
]);

const router = Router();

router.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && TAURI_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

// ── Auth helpers ──────────────────────────────────────────────────────────────

// Comma-separated allowlist of admin emails. Overridable via env without
// code changes; defaults to the owner.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'waldman.sebastian@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdmin(user) {
  return !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!isAdmin(req.user)) return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

function requireAuth(req, res, next) {
  // Accept either a session cookie (web) or a Bearer token (Tauri desktop).
  let token = req.cookies?.session;
  if (!token) {
    const auth = req.headers['authorization'];
    if (auth?.startsWith('Bearer ')) token = auth.slice(7);
  }
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
    path: '/',
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

// ── Google OAuth ──────────────────────────────────────────────────────────────

router.get('/auth/login', (req, res) => {
  const isDesktop = req.query.desktop === '1';
  // Encode the desktop flag in the CSRF state token so the callback knows
  // whether to set a cookie (web) or redirect to the custom deep link (Tauri).
  const state = jwt.sign(
    { csrf: 1, desktop: isDesktop ? 1 : 0 },
    JWT_SECRET,
    { expiresIn: 600 }
  );
  const url = oauth.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
  });
  res.redirect(url);
});

router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!state || !code) return res.status(400).send('Missing OAuth parameters');

    const statePayload = jwt.verify(String(state), JWT_SECRET); // CSRF check
    const isDesktop = !!statePayload.desktop;

    const { tokens } = await oauth.getToken(String(code));
    const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: CLIENT_ID });
    const p = ticket.getPayload();
    const user = {
      uid:   p.sub,
      name:  p.name ?? p.email,
      email: p.email,
      photo: p.picture ?? null,
    };

    if (isDesktop) {
      // Issue a JWT and send it back via the Tauri custom-protocol deep link.
      // The app's deep-link handler extracts the token and stores it locally.
      const token = jwt.sign(
        { uid: user.uid, name: user.name, email: user.email, photo: user.photo },
        JWT_SECRET,
        { expiresIn: JWT_TTL }
      );
      res.redirect(`mosim://auth?token=${encodeURIComponent(token)}`);
    } else {
      setSession(res, user);
      res.redirect('/#/');
    }
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
  res.json({ uid, name, email, photo, admin: isAdmin(req.user) });
});

// ── Global config: steps + themes ────────────────────────────────────────────
// Readable by anyone (steps/themes are not secret); writable by admins only.

router.get('/steps', (_req, res) => {
  res.json({ steps: getSetting('steps') }); // null = client falls back to bundled steps.json
});

router.get('/themes', (_req, res) => {
  res.json({ themes: getSetting('themes') ?? [] });
});

router.put('/admin/steps', requireAdmin, (req, res) => {
  const steps = req.body?.steps;
  if (!Array.isArray(steps)) return res.status(400).json({ error: 'steps must be an array' });
  for (const s of steps) {
    if (!s?.id || !s?.title || !Array.isArray(s.subs)) {
      return res.status(400).json({ error: 'each step needs id, title, subs[]' });
    }
  }
  setSetting('steps', steps);
  res.json({ ok: true });
});

router.put('/admin/themes', requireAdmin, (req, res) => {
  const themes = req.body?.themes;
  if (!Array.isArray(themes)) return res.status(400).json({ error: 'themes must be an array' });
  for (const t of themes) {
    if (!t?.id || !t?.label || typeof t?.vars !== 'object') {
      return res.status(400).json({ error: 'each theme needs id, label, vars{}' });
    }
  }
  setSetting('themes', themes);
  res.json({ ok: true });
});

// ── Bulk data (one request to initialise the whole app) ───────────────────────

router.get('/data', requireAuth, (req, res) => {
  const { uid } = req.user;
  res.json({
    robots:   getAll('robots',   uid),
    modpacks: getAll('modpacks', uid),
    repos:    getAll('repos',    uid),
    scripts:  getAll('scripts',  uid),
  });
});

// ── Robots ────────────────────────────────────────────────────────────────────

router.use('/robots', crud('robots'));

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
  onDelete(uid, modpackId) {
    const rows = db.prepare('SELECT id, data FROM robots WHERE uid = ?').all(uid);
    for (const row of rows) {
      if (JSON.parse(row.data).modpackId === modpackId) {
        update('robots', uid, row.id, { modpackId: null, modpackPrivate: false });
      }
    }
  },
}));

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
  onDelete(uid, repoId) {
    const rows = db.prepare('SELECT id, data FROM robots WHERE uid = ?').all(uid);
    for (const row of rows) {
      if (JSON.parse(row.data).repoId === repoId) {
        update('robots', uid, row.id, { repoId: null });
      }
    }
  },
}));

// ── Scripts ───────────────────────────────────────────────────────────────────

router.use('/scripts', crud('scripts'));

module.exports = router;
