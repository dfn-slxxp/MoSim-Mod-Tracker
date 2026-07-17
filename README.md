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
server/      Express static server for a DigitalOcean droplet
firestore.rules / firestore.indexes.json / firebase.json
```

---

## Setup (required before anything works)

The app requires Firebase for auth and data sync. There is no offline/local mode.

### 1 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project (free Spark plan is fine).
2. **Authentication → Sign-in method → Google → Enable.**
3. **Firestore Database → Create database** (choose production mode, pick any region).
4. **Project settings → Your apps → Web app (`</>`)** — register an app, copy the config object.

### 2 — Paste the config

Open `web/src/firebase-config.ts` and replace the `null`:

```typescript
export const firebaseConfig = {
  apiKey: '...',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '...',
  appId: '...'
};
```

### 3 — Deploy Firestore rules

This enforces access control server-side (not just in the UI):

```powershell
npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase deploy --only firestore
```

### 4 — Build and run

```powershell
cd web
npm install
npm run build
```

Open `web/dist/index.html` in a browser, or use the desktop app (see below),
or deploy to your droplet (see [server/DEPLOY.md](server/DEPLOY.md)).

For local development: `npm run dev` in `web/` → http://localhost:5173.

> **Locking to your account only:** by default any Google account can create
> data in your Firebase project. To lock writes to just you, find your UID in
> Firebase console → Authentication → Users after first sign-in, then replace
> `signedIn()` with `request.auth.uid == 'YOUR_UID_HERE'` in the `create`
> rules in `firestore.rules` and redeploy.

---

## Pages

- **Robots** — spreadsheet-style tracker table: Status/Mod Type color pills,
  modpack, repo link, progress bar, notes. Filter chips across the top.
  "In Unity" rows show the current step. Click any row → splits view.
- **Robot detail** — 10 collapsible split steps with 53 checkable sub-steps,
  a note box per step, "What's left" panel, overall notes, and the AI script generator.
- **Planned** — robots you intend to start. "Start modding →" moves one to In Unity.
- **Modpacks** — the Addressables packs your robots ship in.
- **Repos** — your git repos. The desktop app can **Scan** a repo to find every
  robot folder and cache the result so the web UI sees it too.
- **Scripts** — your personal `.cs` library. Drag files in; the AI generator feeds
  all of them as examples. Export as JSONL for fine-tuning (see [TRAINING.md](TRAINING.md)).
- **Compact** — LiveSplit-style overlay column. `/#/compact` in any browser,
  or what the desktop app shows by default.

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
never written to Firebase or anywhere else.

See [TRAINING.md](TRAINING.md) for how to fine-tune your own model on your script library.

---

## Desktop app (Windows / macOS / Linux)

A plain Python script — no Electron, no Node needed at runtime.

```powershell
# One-time setup
pip install pywebview

# Run (from repo root — web/dist/ must exist first)
python app/main.py
# or double-click app/run.bat (Windows) / app/run.sh (Mac/Linux)
```

- Starts in **compact mode** (360 × 640, always on top) — the LiveSplit overlay.
- 📌 toggles always-on-top. ⛶ expands to full 1000 × 800 UI. ✕ closes.
- Serves `web/dist/` on a local port so Google sign-in works inside it.
- From the Repos page, **Scan** reads your git repo folders on disk.

Uses WebView2 on Windows (ships with Windows 11), WKWebView on macOS, GTK on Linux.

---

## Deploying to a DigitalOcean droplet

See **[server/DEPLOY.md](server/DEPLOY.md)** for a full step-by-step guide covering:
- Uploading the built app to your droplet
- Running it as a systemd service
- nginx reverse proxy + subdomain
- Free HTTPS via certbot
- Authorizing the domain in Firebase

The droplet is just a static file server — all data lives in Firebase, so
redeploys are risk-free and take under a minute.

---

## Privacy

Every robot, modpack, and repo has a **Private** toggle. A private modpack
hides all its member robots too. Access is enforced in `firestore.rules`, not
just the UI — private documents are invisible at the database level to anyone
who isn't you.
