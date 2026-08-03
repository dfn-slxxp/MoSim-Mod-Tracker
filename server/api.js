'use strict';
const { Router } = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  db, getAll, getById, insert, update, remove, getSetting, setSetting,
  getProfile, setProfile, allProfiles, allRobots, allModpacks,
  resolveUid, linkAccount, linkedAccounts, unlinkAccount, mergeAccounts,
} = require('./db');

// Uploaded modpack showcase media — same directory server.js serves at /uploads.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

const mediaUpload = multer({
  storage: multer.diskStorage({
    destination(req, _file, cb) {
      const dir = path.join(UPLOADS_DIR, 'modpacks', req.params.id);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(_req, file, cb) {
      const ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (/^image\//.test(file.mimetype) || /^video\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image or video files are allowed'));
  },
});

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

// ── Rate limiting (in-process; single instance, so a shared Map is correct) ───
// Requires `app.set('trust proxy', 1)` in server.js so req.ip is the real client
// behind nginx, not 127.0.0.1.
function rateLimit({ max, windowMs, message }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
  }, windowMs);
  if (timer.unref) timer.unref();
  return (req, res, next) => {
    const id = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    let e = hits.get(id);
    if (!e || now > e.reset) { e = { count: 0, reset: now + windowMs }; hits.set(id, e); }
    e.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - e.count)));
    if (e.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((e.reset - now) / 1000)));
      return res.status(429).json({ error: message || 'Too many requests — slow down.' });
    }
    next();
  };
}

// Auth endpoints (login/callbacks/link/logout) get a tighter budget than reads.
const authLimiter = rateLimit({ max: 40, windowMs: 5 * 60 * 1000, message: 'Too many sign-in attempts — wait a few minutes.' });

// Tiny TTL memo for hot public reads. Bounded staleness (short TTL) instead of
// write-invalidation, since community/steps/themes all change slowly.
function ttlMemo(ttlMs) {
  let val;
  let exp = 0;
  return (compute) => {
    const now = Date.now();
    if (now < exp) return val;
    val = compute();
    exp = now + ttlMs;
    return val;
  };
}
const communityCache = ttlMemo(15 * 1000);
const stepsCache = ttlMemo(30 * 1000);
const themesCache = ttlMemo(30 * 1000);

const router = Router();

// Baseline limit on ALL /api traffic (generous; the auth limiter is stricter).
router.use(rateLimit({ max: 600, windowMs: 60 * 1000 }));

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

router.get('/auth/login', authLimiter, (req, res) => {
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

router.get('/auth/callback', authLimiter, async (req, res) => {
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

router.get('/auth/callback/github', authLimiter, async (req, res) => {
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

router.get('/auth/callback/discord', authLimiter, async (req, res) => {
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

  let photo = existing.photo ?? req.user.photo ?? null;
  if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'photo')) {
    const p = req.body.photo;
    if (p === null || p === '') {
      // Reset to the sign-in provider's photo (no custom upload).
      photo = req.user.photo ?? null;
    } else if (typeof p === 'string' && /^data:image\/(png|jpe?g|webp);base64,/.test(p)) {
      if (p.length > 400000) return res.status(400).json({ error: 'Photo is too large' });
      photo = p;
    } else {
      return res.status(400).json({ error: 'Invalid photo' });
    }
  }

  setProfile(uid, {
    ...existing,
    displayName,
    instagram,
    discord,
    email: existing.email ?? req.user.email,
    photo,
    completed: true,
    hidden: existing.hidden ?? false,
    createdAt: existing.createdAt ?? Date.now(),
  });
  res.json({ ok: true });
});

// ── Public community directory (homepage) ─────────────────────────────────────
// Users with at least one PUBLIC robot, unless an admin hid them.

router.get('/community', (_req, res) => {
  const payload = communityCache(() => {
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
    return { users };
  });
  res.json(payload);
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
  // null = client falls back to bundled steps.json
  res.json(stepsCache(() => ({ steps: getSetting('steps') })));
});

router.get('/themes', (_req, res) => {
  res.json(themesCache(() => ({ themes: getSetting('themes') ?? [] })));
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

// A modpack's showcase page URL (/packs/:slug) is a user-chosen string, not the
// record's UUID. Validate format + global uniqueness before the generic CRUD
// PUT below applies the patch. Registered first so it runs, then falls through
// (via next()) to the crud router's own PUT /:id for the same route.
function validateModpackSlug(req, res, next) {
  const patch = req.body ?? {};
  if (!('slug' in patch) && !('hasPage' in patch)) return next();

  const uid = req.user.uid;
  const row = db.prepare('SELECT data FROM modpacks WHERE id = ? AND uid = ?').get(req.params.id, uid);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const existing = JSON.parse(row.data);
  const nextSlug = 'slug' in patch ? String(patch.slug ?? '').trim().toLowerCase() : (existing.slug ?? '');
  const nextHasPage = 'hasPage' in patch ? !!patch.hasPage : !!existing.hasPage;

  if (nextHasPage) {
    if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(nextSlug)) {
      return res.status(400).json({ error: 'Page URL must be 3-40 lowercase letters, numbers, or hyphens.' });
    }
    const clash = allModpacks().find((m) => m.slug === nextSlug && m.id !== req.params.id);
    if (clash) {
      return res.status(400).json({ error: 'That page URL is already taken — choose another.' });
    }
  }
  if ('slug' in patch) req.body.slug = nextSlug;
  next();
}
router.put('/modpacks/:id', requireAuth, validateModpackSlug);

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

// Add one image/video to a modpack's showcase carousel (multipart upload).
router.post('/modpacks/:id/media', requireAuth, (req, res) => {
  const uid = req.user.uid;
  const row = db.prepare('SELECT data FROM modpacks WHERE id = ? AND uid = ?').get(req.params.id, uid);
  if (!row) return res.status(404).json({ error: 'Not found' });
  mediaUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const item = {
      id: crypto.randomUUID(),
      type: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
      url: `/uploads/modpacks/${req.params.id}/${req.file.filename}`,
    };
    const modpack = JSON.parse(row.data);
    const media = [...(modpack.media ?? []), item];
    update('modpacks', uid, req.params.id, { media });
    res.status(201).json(item);
  });
});

// Remove one carousel item.
router.delete('/modpacks/:id/media/:mediaId', requireAuth, (req, res) => {
  const uid = req.user.uid;
  const row = db.prepare('SELECT data FROM modpacks WHERE id = ? AND uid = ?').get(req.params.id, uid);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const modpack = JSON.parse(row.data);
  const item = (modpack.media ?? []).find((m) => m.id === req.params.mediaId);
  const media = (modpack.media ?? []).filter((m) => m.id !== req.params.mediaId);
  update('modpacks', uid, req.params.id, { media });
  if (item) {
    const filePath = path.join(UPLOADS_DIR, item.url.replace(/^\/uploads\//, ''));
    fs.unlink(filePath, () => {}); // best-effort — a stray file isn't worth failing the request over
  }
  res.json({ ok: true });
});

// Credit another user on the modpack by email (owner only). Co-author info is
// stored denormalized on the modpack itself (uid/displayName/email snapshot)
// so the owner's own modpack list can show names without an extra lookup.
router.post('/modpacks/:id/authors', requireAuth, (req, res) => {
  const uid = req.user.uid;
  const row = db.prepare('SELECT data FROM modpacks WHERE id = ? AND uid = ?').get(req.params.id, uid);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const found = allProfiles().find((p) => (p.email ?? '').toLowerCase() === email);
  if (!found) return res.status(404).json({ error: 'No user with that email has signed in yet' });
  if (found.uid === uid) return res.status(400).json({ error: 'You are already the owner' });

  const modpack = JSON.parse(row.data);
  const coAuthors = modpack.coAuthors ?? [];
  if (coAuthors.some((a) => a.uid === found.uid)) {
    return res.status(400).json({ error: 'Already added as an author' });
  }
  const author = { uid: found.uid, displayName: found.displayName || 'Modder', email };
  update('modpacks', uid, req.params.id, { coAuthors: [...coAuthors, author] });
  res.status(201).json(author);
});

// Remove a credited co-author (owner only).
router.delete('/modpacks/:id/authors/:uid', requireAuth, (req, res) => {
  const uid = req.user.uid;
  const row = db.prepare('SELECT data FROM modpacks WHERE id = ? AND uid = ?').get(req.params.id, uid);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const modpack = JSON.parse(row.data);
  const coAuthors = (modpack.coAuthors ?? []).filter((a) => a.uid !== req.params.uid);
  update('modpacks', uid, req.params.id, { coAuthors });
  res.json({ ok: true });
});

// ── Public modpack showcase (/packs) ──────────────────────────────────────────
// Only modpacks the owner marked hasPage AND that aren't private. Public — no
// auth required, mirrors the /community pattern.

function toPublicPack(m, profilesByUid) {
  const owner = {
    uid: m.uid,
    displayName: profilesByUid.get(m.uid)?.displayName ?? 'Modder',
  };
  const authors = [owner, ...(m.coAuthors ?? []).map((a) => ({ uid: a.uid, displayName: a.displayName }))];
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    game: m.game,
    description: m.description ?? '',
    media: m.media ?? [],
    authors,
  };
}

router.get('/packs', (_req, res) => {
  const profilesByUid = new Map(allProfiles().map((p) => [p.uid, p]));
  const packs = allModpacks()
    .filter((m) => m.hasPage && !m.private && m.slug)
    .map((m) => toPublicPack(m, profilesByUid))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json({ packs });
});

router.get('/packs/:slug', (req, res) => {
  const m = allModpacks().find((x) => x.hasPage && !x.private && x.slug === req.params.slug);
  if (!m) return res.status(404).json({ error: 'Not found' });
  const profilesByUid = new Map(allProfiles().map((p) => [p.uid, p]));
  res.json(toPublicPack(m, profilesByUid));
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

// PUBLIC raw content link (id is an unguessable UUID, same trust model as the
// /robot/:id and /u/:uid embed pages) — lets a generated AI prompt reference a
// script by URL instead of pasting its full content inline.
router.get('/scripts/:id/raw', (req, res) => {
  const script = getById('scripts', req.params.id);
  if (!script) return res.status(404).type('text/plain').send('Script not found');
  const safeName = (script.name || 'script.cs').replace(/[^\w.-]+/g, '_');
  res.type('text/plain').set('Content-Disposition', `inline; filename="${safeName}"`).send(script.content ?? '');
});

router.use('/scripts', crud('scripts'));

module.exports = router;
