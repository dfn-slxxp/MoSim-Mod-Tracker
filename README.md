# MoSim Mod Tracker

LiveSplit-style progress tracker for [MoSim](https://mosimulator.com/modding/) robot mods.
Sign in with Google → your data syncs across every device (browser, desktop app, phone).

Tracks robots through **Planned → In Unity → Semi-Functional → Released**, with
10 steps / 53 sub-steps derived from the official MoSim docs
([modding intro](https://docs.mosimulator.com/modding/intro) + [9496 Lynk walkthrough](https://docs.mosimulator.com/modding/lynk-walkthrough/model-prep)).
Edit `steps.json` at the repo root to change your workflow.

```
steps.json   Shared split template (web + desktop both read this)
web/         React + Vite web UI
app/         Python desktop app (always-on-top, no Electron)
server/      Express API + static server for a DigitalOcean droplet
```

All data is stored in a SQLite database (`server/data.db`) on your droplet.
No Firebase, no third-party database service.

---

## Setup

### 1 — Create Google OAuth credentials

You need a Google Cloud project (free) to enable "Sign in with Google":

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create/select a project.
2. **APIs & Services → OAuth consent screen** → External → fill in app name + your email.
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Type: **Web application**
   - Authorized redirect URIs (add both):
     - `http://localhost:8787/api/auth/callback` (local dev)
     - `https://mods.yoursite.com/api/auth/callback` (production, your actual domain)
4. Copy the **Client ID** and **Client Secret**.

### 2 — Configure the server locally

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and fill in your Client ID, Client Secret, and a random JWT secret:

```env
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
OAUTH_REDIRECT_URI=http://localhost:8787/api/auth/callback
JWT_SECRET=any-long-random-string
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3 — Install and run

```bash
# Install server deps
cd server && npm install

# Install + build web app
cd ../web && npm install && npm run build

# Start the server (from repo root)
node server/server.js
```

Open [http://localhost:8787](http://localhost:8787) → Sign in with Google.

### 4 — Local development (hot reload)

Run both servers in parallel:

```bash
# Terminal 1 — API + data
node server/server.js

# Terminal 2 — Vite dev server (proxies /api/* to 8787)
cd web && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Pages

- **Robots** — spreadsheet-style tracker: Status/Mod Type pills, modpack, repo link, progress bar, notes. Filter chips across the top. "In Unity" rows show the current step. Click any row → splits view.
- **Robot detail** — 10 collapsible steps with 53 checkable sub-steps, a note box per step, "What's left" panel, overall notes, and the AI script generator.
- **Planned** — robots you haven't started yet. "Start modding →" moves one to In Unity.
- **Modpacks** — the Addressables packs your robots ship in.
- **Repos** — your git repos. The desktop app can **Scan** a repo to find every robot folder.
- **Scripts** — your personal `.cs` library. Drag files in; the AI generator feeds all of them as examples. Export as JSONL for fine-tuning (see [TRAINING.md](TRAINING.md)).
- **Compact** — LiveSplit-style overlay column. `/#/compact` in any browser, or what the desktop app shows by default.

Themes: 🌙/☀️/☁️ in the top bar cycles **Dark → Light → Cloud** (soft blue).

---

## AI script generator

On any robot's page, the AI panel lets you describe the robot and generate a
complete C# script using the real MoSim APIs.

**Two providers:**

| Provider | Cost | Internet |
|----------|------|---------|
| Claude API (Anthropic) | ~$0.01–0.10/script | Yes |
| Local Ollama model (your own fine-tune) | Free | No |

Your API key and Ollama settings are stored **only in that device's `localStorage`** —
never written to the server.

See [TRAINING.md](TRAINING.md) for how to fine-tune your own model on your script library.

---

## Desktop app (Windows / macOS / Linux)

A plain Python script — no Electron, no Node needed at runtime.

```bash
# One-time setup
pip install pywebview

# Run (points at http://localhost:8787 by default)
python app/main.py
# or double-click app/run.bat (Windows) / app/run.sh (Mac/Linux)

# Point at your deployed server instead
MOSIM_URL=https://mods.yoursite.com python app/main.py
```

- Starts in **compact mode** (360 × 640, always on top) — the LiveSplit overlay.
- 📌 toggles always-on-top. ⛶ expands to full 1000 × 800 UI. ✕ closes.
- From the Repos page, **Scan** reads your local git repo folders.

Uses WebView2 on Windows (ships with Windows 11), WKWebView on macOS, GTK on Linux.

---

## Deploying to a DigitalOcean droplet

See **[server/DEPLOY.md](server/DEPLOY.md)** for a full step-by-step guide covering:
- Setting up Google OAuth credentials
- Running the server as a systemd service
- nginx reverse proxy + subdomain
- Free HTTPS via certbot

Data is stored in `server/data.db` on the droplet — back it up with `scp`.
Deploys are `git pull + build + restart` and never touch the database.

---

## Privacy

Every robot, modpack, and repo has a **Private** toggle (visible only to you — the server
only returns your own data since everything requires sign-in).
