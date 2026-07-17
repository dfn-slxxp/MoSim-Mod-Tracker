// ---------------------------------------------------------------------------
// Tiny production web server for a DigitalOcean droplet (or any Linux box).
// It only serves the built web app (web/dist) — all data still lives in
// Firebase, so this box holds no state and needs no database.
//
// Usage:  node server.js            (port 8787 by default)
//         PORT=3000 node server.js
// See DEPLOY.md for the full droplet + nginx + HTTPS walkthrough.
// ---------------------------------------------------------------------------
const express = require('express');
const compression = require('compression');
const path = require('path');

const fs   = require('fs');
const PORT = process.env.PORT || 8787;

// Git-clone layout: web/dist is one level up from server/.
// Legacy scp layout (still works): server/dist/.
const DIST = [
  path.join(__dirname, '..', 'web', 'dist'),
  path.join(__dirname, 'dist'),
].find(fs.existsSync) ?? path.join(__dirname, '..', 'web', 'dist');

const app = express();
app.use(compression()); // gzip responses
app.use(express.static(DIST, { maxAge: '1h', index: 'index.html' }));

// Single-page-app fallback: any unknown path gets index.html and the
// client-side router takes it from there.
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MoSim Mod Tracker serving on http://localhost:${PORT}`);
});
