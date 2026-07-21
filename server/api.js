'use strict';
const { Router } = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const {
  db, getAll, insert, update, remove, getSetting, setSetting,
  getProfile, setProfile, allProfiles, allRobots,
  resolveUid, linkAccount, linkedAccounts, unlinkAccount, mergeAccounts,
} = require('./db');

/** First token of a full name, used as the default display name. */
function firstName(name) {
  return String(name ?? '').trim().split(/\s+/)[0] || String(name ?? '').trim();
}

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

// ── Extra sign-in providers (optional) ───────────────────────────────────────
// GitHub and Discord are enabled only when their credentials are present in
// the environment. Their registered callback URLs are the Google one plus a
// provider suffix, e.g. https://host/api/auth/callback/github.

const GITHUB_CLIENT_ID      = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET  = process.env.GITHUB_CLIENT_SECRET;
const DISCORD_CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

const githubEnabled  = () => !!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET);
const discordEnabled = () => !!(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET);

const GITHUB_REDIRECT_URI  = `${REDIRECT_URI}/github`;
const DISCORD_REDIRECT_URI = `${REDIRECT_URI}/discord`;

/** Which provider a stored subject belongs to (bare Google subs have no prefix). */
function providerOf(sub) {
  if (String(sub).startsWith('github:')) return 'github';
  if (String(sub).startsWith('discord:')) return 'discord';
  return 'google';
}

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
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'waldman.sebastian@gmail.com,seb@sebastianw.tech')
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

// ── OAuth (Google + GitHub + Discord) ─────────────────────────────────────────

/** Build the provider's authorization URL for a signed state token. */
function authUrlFor(provider, state, { linking = false } = {}) {
  if (provider === 'github') {
    if (!githubEnabled()) return null;
    const q = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_REDIRECT_URI,
      scope: 'read:user user:email',
      state,
    });
    return `https://github.com/login/oauth/authorize?${q}`;
  }
  if (provider === 'discord') {
    if (!discordEnabled()) return null;
    const q = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify email',
      state,
    });
    return `https://discord.com/oauth2/authorize?${q}`;
  }
  return oauth.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    // Linking: let the user pick another Google account rather than silently
    // reusing the current Google session.
    ...(linking ? { prompt: 'select_account' } : {}),
    state,
  });
}

// Which sign-in providers are configured. Public: drives the login buttons.
router.get('/auth/providers', (_req, res) => {
  res.json({ google: true, github: githubEnabled(), discord: discordEnabled() });
});

router.get('/auth/login', (req, res) => {
  const isDesktop = req.query.desktop === '1';
  const provider = String(req.query.provider ?? 'google');
  // Encode the desktop flag in the CSRF state token so the callback knows
  // whether to set a cookie (web) or redirect to the custom deep link (Tauri).
  const state = jwt.sign(
    { csrf: 1, desktop: isDesktop ? 1 : 0 },
    JWT_SECRET,
    { expiresIn: 600 }
  );
  const url = authUrlFor(provider, state);
  if (!url) return res.status(400).send(`Sign-in provider not available: ${provider}`);
  res.redirect(url);
});

// Begin linking ANOTHER account (any provider) to the signed-in account.
// Authenticated (cookie or Bearer) so the primary uid is trusted; returns the
// provider's auth URL for the frontend to open.
router.post('/auth/link-start', requireAuth, (req, res) => {
  const provider = String(req.body?.provider ?? 'google');
  const state = jwt.sign(
    { csrf: 1, link: req.user.uid, desktop: req.body?.desktop ? 1 : 0 },
    JWT_SECRET,
    { expiresIn: 600 }
  );
  const url = authUrlFor(provider, state, { linking: true });
  if (!url) return res.status(400).json({ error: `Sign-in provider not available: ${provider}` });
  res.json({ url });
});

/**
 * Shared tail of every OAuth callback. `ident` describes the account that just
 * authenticated: { subject, name, email, photo, handle }. `subject` is the
 * stored identity key — the bare Google sub, or a prefixed id like
 * 'github:123' / 'discord:456'. `handle` is a display fallback for providers
 * where the email can be missing (GitHub).
 */
function finishAuth(res, statePayload, ident) {
  const isDesktop = !!statePayload.desktop;

  // ── Link flow: associate this account with the signed-in account ──
  if (statePayload.link) {
    const primaryUid = resolveUid(statePayload.link);
    if (ident.subject !== primaryUid) {
      // Combine any robots/data the linked account already had into the
      // primary account, then record the mapping.
      mergeAccounts(ident.subject, primaryUid);
      linkAccount(ident.subject, primaryUid, ident.email || ident.handle || null);
    }
    return res.redirect(isDesktop ? 'mosim://auth?linked=1' : '/#/account?linked=1');
  }

  // ── Normal login: resolve to the primary account, then issue a session ──
  const uid = resolveUid(ident.subject);
  const user = {
    uid,
    name:  ident.name,
    email: ident.email ?? null,  // the email actually signed in with (drives admin check)
    photo: ident.photo ?? null,
  };

  // Refresh the profile ONLY when signing in with the primary account, so a
  // linked secondary login never overwrites the primary's name/photo/email.
  const existing = getProfile(uid);
  if (ident.subject === uid) {
    setProfile(uid, {
      displayName: existing?.displayName ?? firstName(ident.name),
      email: user.email,
      photo: user.photo,
      instagram: existing?.instagram ?? '',
      discord: existing?.discord ?? '',
      completed: existing?.completed ?? false,
      hidden: existing?.hidden ?? false,
      createdAt: existing?.createdAt ?? Date.now(),
    });
  }

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
}

router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!state || !code) return res.status(400).send('Missing OAuth parameters');

    const statePayload = jwt.verify(String(state), JWT_SECRET); // CSRF check

    const { tokens } = await oauth.getToken(String(code));
    const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: CLIENT_ID });
    const p = ticket.getPayload();

    finishAuth(res, statePayload, {
      subject: p.sub,
      name:  p.name ?? p.email,
      email: p.email,
      photo: p.picture ?? null,
      handle: p.email,
    });
  } catch (e) {
    res.status(400).send('Sign-in failed: ' + e.message);
  }
});

router.get('/auth/callback/github', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!state || !code) return res.status(400).send('Missing OAuth parameters');
    if (!githubEnabled()) return res.status(400).send('GitHub sign-in is not configured');

    const statePayload = jwt.verify(String(state), JWT_SECRET); // CSRF check

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: String(code),
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });
    const tokenBody = await tokenRes.json();
    const accessToken = tokenBody?.access_token;
    if (!accessToken) {
      throw new Error(tokenBody?.error_description || 'GitHub token exchange failed');
    }

    const ghHeaders = {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'mosim-mod-tracker',
    };
    const userRes = await fetch('https://api.github.com/user', { headers: ghHeaders });
    if (!userRes.ok) throw new Error(`GitHub user lookup failed (${userRes.status})`);
    const gh = await userRes.json();

    // The public profile email is often unset; the /user/emails endpoint
    // (user:email scope) has the real ones. Prefer the primary verified email.
    let email = gh.email ?? null;
    if (!email) {
      const emailRes = await fetch('https://api.github.com/user/emails', { headers: ghHeaders });
      if (emailRes.ok) {
        const emails = await emailRes.json();
        const best =
          emails.find((e) => e.primary && e.verified) ??
          emails.find((e) => e.verified) ??
          emails[0];
        email = best?.email ?? null;
      }
    }

    finishAuth(res, statePayload, {
      subject: `github:${gh.id}`,
      name:  gh.name || gh.login,
      email,
      photo: gh.avatar_url ?? null,
      handle: gh.login,
    });
  } catch (e) {
    res.status(400).send('Sign-in failed: ' + e.message);
  }
});

router.get('/auth/callback/discord', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!state || !code) return res.status(400).send('Missing OAuth parameters');
    if (!discordEnabled()) return res.status(400).send('Discord sign-in is not configured');

    const statePayload = jwt.verify(String(state), JWT_SECRET); // CSRF check

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });
    const tokenBody = await tokenRes.json();
    const accessToken = tokenBody?.access_token;
    if (!accessToken) {
      throw new Error(tokenBody?.error_description || 'Discord token exchange failed');
    }

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) throw new Error(`Discord user lookup failed (${userRes.status})`);
    const dc = await userRes.json();

    finishAuth(res, statePayload, {
      subject: `discord:${dc.id}`,
      name:  dc.global_name || dc.username,
      // Only trust verified emails for the admin allowlist check.
      email: dc.verified ? (dc.email ?? null) : null,
      photo: dc.avatar ? `https://cdn.discordapp.com/avatars/${dc.id}/${dc.avatar}.png` : null,
      handle: dc.username,
    });
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
  const profile = getProfile(uid);
  res.json({
    uid,
    name: profile?.displayName || name,
    email,                                  // email currently signed in with
    primaryEmail: profile?.email ?? email,  // the account's root email
    photo: profile?.photo ?? photo,
    admin: isAdmin(req.user),
    // [{ sub, email, provider }] secondary sign-in accounts
    linked: linkedAccounts(uid).map((l) => ({ ...l, provider: providerOf(l.sub) })),
    provider: providerOf(uid),              // primary account's sign-in provider
    profile: {
      displayName: profile?.displayName ?? name,
      instagram: profile?.instagram ?? '',
      discord: profile?.discord ?? '',
      completed: profile?.completed ?? false,
    },
  });
});

// Unlink a secondary Google account from this account.
router.delete('/account/links/:sub', requireAuth, (req, res) => {
  const ok = unlinkAccount(req.params.sub, req.user.uid);
  if (!ok) return res.status(404).json({ error: 'No such linked account' });
  res.json({ ok: true });
});

// ── Profile (account page) ────────────────────────────────────────────────────

router.put('/profile', requireAuth, (req, res) => {
  const uid = req.user.uid;
  const existing = getProfile(uid) ?? {};
  const displayName = String(req.body?.displayName ?? '').trim().slice(0, 40);
  // Instagram: bare handle, strip @ and any URL prefix
  const instagram = String(req.body?.instagram ?? '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .slice(0, 30);
  const discord = String(req.body?.discord ?? '').trim().replace(/^@/, '').slice(0, 40);
  if (!displayName) return res.status(400).json({ error: 'Display name is required' });

  setProfile(uid, {
    ...existing,
    displayName,
    instagram,
    discord,
    email: existing.email ?? req.user.email,
    photo: existing.photo ?? req.user.photo ?? null,
    completed: true,
    hidden: existing.hidden ?? false,
    createdAt: existing.createdAt ?? Date.now(),
  });
  res.json({ ok: true });
});

// ── Public community directory (homepage) ─────────────────────────────────────
// Users with at least one PUBLIC robot, unless an admin hid them.

router.get('/community', (_req, res) => {
  const robots = allRobots().filter((r) => !r.private && !r.modpackPrivate);
  const counts = new Map();
  const games = new Map();
  for (const r of robots) {
    counts.set(r.uid, (counts.get(r.uid) ?? 0) + 1);
    if (r.game) {
      if (!games.has(r.uid)) games.set(r.uid, new Set());
      games.get(r.uid).add(r.game);
    }
  }
  const users = allProfiles()
    .filter((p) => !p.hidden && (counts.get(p.uid) ?? 0) > 0)
    .map((p) => ({
      uid: p.uid,
      displayName: p.displayName ?? 'Modder',
      photo: p.photo ?? null,
      instagram: p.instagram ?? '',
      discord: p.discord ?? '',
      robotCount: counts.get(p.uid),
      games: [...(games.get(p.uid) ?? [])].sort(),
    }))
    .sort((a, b) => b.robotCount - a.robotCount);
  res.json({ users });
});

// One community member's PUBLIC mods (clicking a user on the homepage).
router.get('/community/:uid', (req, res) => {
  const uid = req.params.uid;
  const profile = getProfile(uid);
  if (!profile || profile.hidden) return res.status(404).json({ error: 'User not found' });

  const robots = allRobots()
    .filter((r) => r.uid === uid && !r.private && !r.modpackPrivate)
    .map((r) => ({
      id: r.id,
      team: r.team ?? '',
      teamName: r.teamName ?? null,
      name: r.name ?? '',
      game: r.game ?? '',
      status: r.status ?? 'planned',
      modType: r.modType ?? '',
      progress: r.progress ?? {},
      createdAt: r.createdAt ?? 0,
    }))
    .sort((a, b) => a.createdAt - b.createdAt);

  if (robots.length === 0) return res.status(404).json({ error: 'No public mods' });

  res.json({
    user: {
      uid,
      displayName: profile.displayName ?? 'Modder',
      photo: profile.photo ?? null,
      instagram: profile.instagram ?? '',
      discord: profile.discord ?? '',
    },
    robots,
  });
});

// ── Admin: community visibility ───────────────────────────────────────────────

router.get('/admin/users', requireAdmin, (_req, res) => {
  const robots = allRobots();
  const total = new Map();
  const pub = new Map();
  for (const r of robots) {
    total.set(r.uid, (total.get(r.uid) ?? 0) + 1);
    if (!r.private && !r.modpackPrivate) pub.set(r.uid, (pub.get(r.uid) ?? 0) + 1);
  }
  res.json({
    users: allProfiles().map((p) => ({
      uid: p.uid,
      displayName: p.displayName ?? '(no name)',
      email: p.email ?? '',
      photo: p.photo ?? null,
      hidden: !!p.hidden,
      robotCount: total.get(p.uid) ?? 0,
      publicRobotCount: pub.get(p.uid) ?? 0,
    })),
  });
});

router.put('/admin/users/:uid/visibility', requireAdmin, (req, res) => {
  const profile = getProfile(req.params.uid);
  if (!profile) return res.status(404).json({ error: 'No such user' });
  setProfile(req.params.uid, { ...profile, hidden: !!req.body?.hidden });
  res.json({ ok: true });
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

// ── TBA proxy ─────────────────────────────────────────────────────────────────
// One server-side The Blue Alliance read key (TBA_AUTH_KEY env) so users never
// enter their own. Authed to avoid being an open proxy; responses cached
// in-memory (team names basically never change).

const TBA_AUTH_KEY = process.env.TBA_AUTH_KEY;
const tbaCache = new Map(); // team number -> { at, status, body }
const TBA_CACHE_TTL = 24 * 60 * 60 * 1000;

router.get('/tba/team/:number', requireAuth, async (req, res) => {
  if (!TBA_AUTH_KEY) return res.status(404).json({ error: 'TBA lookup not configured' });
  const num = /^\d+$/.test(req.params.number) ? req.params.number : null;
  if (!num) return res.status(400).json({ error: 'Invalid team number' });

  const hit = tbaCache.get(num);
  if (hit && Date.now() - hit.at < TBA_CACHE_TTL) {
    return res.status(hit.status).json(hit.body);
  }
  try {
    const r = await fetch(`https://www.thebluealliance.com/api/v3/team/frc${num}`, {
      headers: { 'X-TBA-Auth-Key': TBA_AUTH_KEY },
    });
    if (!r.ok) {
      const body = { error: 'Team not found' };
      tbaCache.set(num, { at: Date.now(), status: 404, body });
      return res.status(404).json(body);
    }
    const t = await r.json();
    const body = { nickname: t.nickname ?? null, name: t.name ?? null };
    tbaCache.set(num, { at: Date.now(), status: 200, body });
    res.json(body);
  } catch (e) {
    res.status(502).json({ error: 'TBA request failed: ' + e.message });
  }
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
