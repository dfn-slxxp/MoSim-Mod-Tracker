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

const PORT = process.env.PORT || 8787;

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

// Static files + SPA fallback
app.use(express.static(DIST, { maxAge: '1h', index: 'index.html' }));
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MoSim Mod Tracker on http://localhost:${PORT}`);
});
