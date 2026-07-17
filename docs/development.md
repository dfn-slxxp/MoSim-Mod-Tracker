# Local Development

How to run the full stack locally for development.

---

## Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **Rust (stable)** — [rustup.rs](https://rustup.rs)
- **Git**
- **Python 3.9+** with Pillow (only needed to regenerate installer assets)
- **Linux only:** `sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev`
- **Google OAuth credentials** — see [server-setup.md](server-setup.md#step-3--create-google-oauth-credentials). For local dev, add `http://localhost:8787/api/auth/callback` as an authorized redirect URI.

---

## First-time setup

```bash
git clone https://github.com/dfn-slxxp/mosim-mod-tracker.git
cd mosim-mod-tracker

# Node dependencies
npm install                  # root: installs @tauri-apps/cli
npm --prefix web install     # web: React + @tauri-apps/api
npm --prefix server install  # server: Express + better-sqlite3 + etc.

# Rust (Tauri downloads its deps on first build — takes a few minutes)
# No extra step needed; `npm run dev` triggers cargo.

# App icons (needed before first Tauri build)
pip install pillow
python installer/generate-assets.py
npm run tauri -- icon installer/assets/icon.png
```

---

## Server credentials

Copy the example env file and fill in your Google credentials:

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
OAUTH_REDIRECT_URI=http://localhost:8787/api/auth/callback
JWT_SECRET=any-long-random-string-here
NODE_ENV=development
PORT=8787
```

> `server/.env` is gitignored and never committed.

---

## Running the web app in a browser

```bash
# Terminal 1 — start the server
node server/server.js

# Terminal 2 — start the Vite dev server
npm --prefix web run dev
```

Open `http://localhost:5173`. API calls proxy to `localhost:8787` automatically (see `web/vite.config.ts`). Sign in works via the server-side OAuth redirect.

---

## Running the Tauri desktop app

```bash
npm run dev
```

This starts both the Vite dev server and the Tauri window in one command. The window opens immediately showing the locally-bundled UI; hot-module reload works — changes to `web/src/` appear in the window without restarting.

The server still needs to run separately (in another terminal):

```bash
node server/server.js
```

On first launch the app reads `src-tauri/mosim.conf` (if it exists) for the server URL, otherwise defaults to `http://localhost:8787`.

---

## Building a production desktop app

```bash
npm run build
```

Output:
- Windows → `src-tauri/target/release/bundle/nsis/*.exe`
- macOS   → `src-tauri/target/release/bundle/dmg/*.dmg`
- Linux   → `src-tauri/target/release/bundle/appimage/*.AppImage`

---

## Project structure

```
mosim-mod-tracker/
├── web/               React + TypeScript frontend
│   ├── src/
│   │   ├── lib/desktop.ts    Tauri bridge (sets up window.desktop)
│   │   ├── store/http.ts     API client (web + Tauri dual-mode)
│   │   └── ...
│   └── vite.config.ts
├── server/            Express REST API
│   ├── server.js      Entry point
│   ├── api.js         Routes: OAuth, CRUD, CORS
│   ├── db.js          SQLite helpers
│   └── manage.sh      Droplet deploy script
├── src-tauri/         Rust Tauri backend
│   ├── src/
│   │   ├── commands.rs  Native: pin, resize, scan_repo, read_script
│   │   ├── config.rs    Reads MOSIM_URL from env / mosim.conf
│   │   └── lib.rs       Deep-link handler + command registration
│   └── tauri.conf.json
├── desktop/           Electron shell (legacy — superseded by Tauri)
├── installer/         Asset generator + old platform build scripts
└── .github/workflows/release.yml   CI: builds all platforms on tag push
```

---

## Releasing a new version

1. Update the version in `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`
2. Commit and push
3. Tag the commit:

```bash
git tag v1.2.3
git push --tags
```

GitHub Actions builds all three platforms in parallel and creates a GitHub Release with the installers attached. Takes about 15 minutes.
