// ---------------------------------------------------------------------------
// MoSim Mod Tracker — production server
// Handles both the REST API (auth + data) and serving the built React SPA.
//
// Usage:  node server.js            (port 8787 by default)
//         PORT=3000 node server.js
// See DEPLOY.md for the full droplet + nginx + HTTPS walkthrough.
// ---------------------------------------------------------------------------
'use strict';
require('dotenv').config(); // loads server/.env before anything else

const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { getProfile, allRobots, allModpacks, getSetting } = require('./db');

const PORT = process.env.PORT || 8787;
const SITE = process.env.PUBLIC_ORIGIN || 'https://mods.sebastianw.tech';
// Uploaded modpack showcase media (images/videos). Outside the repo tree in
// production, same pattern as DB_PATH — see server/manage.sh.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Social embeds (Open Graph) ────────────────────────────────────────────────
// Crawlers (Discordbot, etc.) don't run JS, so per-page previews must be in the
// served HTML. index.html carries site-wide defaults; renderIndex() overrides
// them per public page. All injected values are HTML-escaped.

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let _indexHtml = null;
function indexHtml() {
  if (_indexHtml == null) {
    try { _indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8'); }
    catch { _indexHtml = '<!doctype html><title>MoSim Mod Tracker</title><div id="root"></div>'; }
  }
  return _indexHtml;
}

function renderIndex({ title, description, image, url }) {
  let html = indexHtml();
  const setMeta = (attr, key, val) => {
    const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`, 'i');
    html = html.replace(re, `$1${escapeHtml(val)}$2`);
  };
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:image', image);
  setMeta('property', 'og:url', url);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);
  return html;
}

// Current workflow steps: admin-edited copy (settings table) wins, else the
// bundled steps.json. Read live per request so the embed reflects the real
// template. The bundled default is cached; the admin override is not (changes
// rarely, and getSetting is a cheap indexed lookup).
let _bundledSteps = null;
function bundledSteps() {
  if (_bundledSteps == null) {
    try {
      _bundledSteps = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'steps.json'), 'utf8')).steps ?? [];
    } catch {
      _bundledSteps = [];
    }
  }
  return _bundledSteps;
}
function currentSteps() {
  const override = getSetting('steps');
  return Array.isArray(override) && override.length ? override : bundledSteps();
}

// Progress derived from the live steps template + the robot's saved checkmarks.
// Status is derived from completion (not the stored status field) so a shared
// link always shows where the build actually is.
function robotProgress(robot) {
  const steps = currentSteps();
  const progress = robot.progress || {};
  let totalSubs = 0, doneSubs = 0, doneSteps = 0;
  for (const step of steps) {
    const subs = step.subs || [];
    const checks = progress[step.id]?.subs || {};
    const done = subs.filter((s) => checks[s.id]).length;
    totalSubs += subs.length;
    doneSubs += done;
    if (subs.length > 0 && done === subs.length) doneSteps += 1;
  }
  const totalSteps = steps.length;
  const percent = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;
  const status = percent >= 100 ? 'Complete' : percent > 0 ? 'In progress' : 'Planned';
  return { totalSubs, doneSubs, totalSteps, doneSteps, percent, status };
}

// Git-clone layout: web/dist is one level up from server/.
// Legacy scp layout (still works): server/dist/.
const DIST = [
  path.join(__dirname, '..', 'web', 'dist'),
  path.join(__dirname, 'dist')
].find(fs.existsSync) ?? path.join(__dirname, '..', 'web', 'dist');

const app = express();
// Single nginx reverse proxy in front — trust it so req.ip is the real client
// (X-Forwarded-For), which per-IP rate limiting depends on.
app.set('trust proxy', 1);
app.use(compression());
app.use(cookieParser());
// Cap request bodies: fits the ~400KB script upload cap with headroom, and
// rejects oversized payloads (basic abuse/DoS hardening). Default was 100KB,
// which would have silently rejected large script uploads.
app.use(express.json({ limit: '600kb' }));

// API routes — must come before the static middleware so /api/* is never
// served as a file-not-found 404 fallback.
app.use('/api', require('./api'));

// Uploaded modpack showcase media — publicly readable (same trust model as
// the rest of the /packs showcase: unguessable-enough paths, no secrets).
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }));

// Per-user share page (real path, so crawlers get a custom embed). Uses only
// PUBLIC data — the public robot COUNT, never robot details — so private robots
// never leak. Users with no public mods (or hidden) get the generic embed.
// Humans are bounced into the SPA's hash route.
app.get('/u/:uid', (req, res) => {
  const uid = req.params.uid;
  const profile = getProfile(uid);
  const publicCount = profile && !profile.hidden
    ? allRobots().filter((r) => r.uid === uid && !r.private && !r.modpackPrivate).length
    : 0;

  const og = profile && !profile.hidden && publicCount > 0
    ? {
        title: `${profile.displayName || 'Modder'} · MoSim Mod Tracker`,
        description: `${profile.displayName || 'Modder'} has ${publicCount} public MoSim mod${publicCount === 1 ? '' : 's'} — see their FRC robot builds.`,
        image: profile.photo || `${SITE}/favicon.png`,
        url: `${SITE}/u/${encodeURIComponent(uid)}`,
      }
    : {
        title: 'MoSim Mod Tracker',
        description: 'Bring real FRC robots into MoSim and track every build from idea to release.',
        image: `${SITE}/favicon.png`,
        url: `${SITE}/`,
      };

  const redirect = `<script>location.replace('/#/u/' + ${JSON.stringify(uid)});</script>`;
  const html = renderIndex(og).replace('</head>', `${redirect}</head>`);
  res.set('Content-Type', 'text/html; charset=utf-8').send(html);
});

// Per-robot share page (real path, so crawlers get a custom embed). Only PUBLIC
// robots get a real preview; private ones fall back to the generic embed so
// nothing leaks. Progress + status are computed live from the steps template, so
// the preview auto-updates as the build progresses. Humans are bounced to the SPA.
app.get('/robot/:id', (req, res) => {
  const id = req.params.id;
  const robot = allRobots().find((r) => r.id === id);
  const isPublic = robot && !robot.private && !robot.modpackPrivate;

  let og;
  if (isPublic) {
    const p = robotProgress(robot);
    const team = robot.team ? `Team ${robot.team}` : 'FRC robot';
    const name = robot.name && robot.name !== `Team ${robot.team}` ? robot.name : team;
    const parts = [team, robot.game, p.status,
      `${p.percent}% complete (${p.doneSubs}/${p.totalSubs} sub-steps · ${p.doneSteps}/${p.totalSteps} steps)`]
      .filter(Boolean);
    const owner = getProfile(robot.uid);
    og = {
      title: `${name} · MoSim Mod Tracker`,
      description: parts.join(' · '),
      image: (owner && !owner.hidden && owner.photo) || `${SITE}/favicon.png`,
      url: `${SITE}/robot/${encodeURIComponent(id)}`,
    };
  } else {
    og = {
      title: 'MoSim Mod Tracker',
      description: 'Bring real FRC robots into MoSim and track every build from idea to release.',
      image: `${SITE}/favicon.png`,
      url: `${SITE}/`,
    };
  }

  const redirect = `<script>location.replace('/#/robot/' + ${JSON.stringify(id)});</script>`;
  const html = renderIndex(og).replace('</head>', `${redirect}</head>`);
  res.set('Content-Type', 'text/html; charset=utf-8').send(html);
});

// Per-modpack showcase share page (real path, so crawlers get a custom
// embed). Only packs with hasPage AND not private are public; everything
// else falls back to the generic embed. Humans are bounced to the SPA.
app.get('/pack/:slug', (req, res) => {
  const slug = req.params.slug;
  const pack = allModpacks().find((m) => m.hasPage && !m.private && m.slug === slug);

  let og;
  if (pack) {
    const owner = getProfile(pack.uid);
    const firstImage = (pack.media || []).find((m) => m.type === 'image');
    og = {
      title: `${pack.name} · MoSim Mod Tracker`,
      description: (pack.description || `A ${pack.game} modpack for MoSim.`).slice(0, 300),
      image: firstImage ? `${SITE}${firstImage.url}` : (owner && !owner.hidden && owner.photo) || `${SITE}/favicon.png`,
      url: `${SITE}/pack/${encodeURIComponent(slug)}`,
    };
  } else {
    og = {
      title: 'MoSim Mod Tracker',
      description: 'Bring real FRC robots into MoSim and track every build from idea to release.',
      image: `${SITE}/favicon.png`,
      url: `${SITE}/`,
    };
  }

  const redirect = `<script>location.replace('/#/packs/' + ${JSON.stringify(slug)});</script>`;
  const html = renderIndex(og).replace('</head>', `${redirect}</head>`);
  res.set('Content-Type', 'text/html; charset=utf-8').send(html);
});

// Static files + SPA fallback
app.use(express.static(DIST, { maxAge: '1h', index: 'index.html' }));
app.get('*', (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8').send(indexHtml());
});

app.listen(PORT, () => {
  console.log(`MoSim Mod Tracker on http://localhost:${PORT}`);
});
