# MoSim Mod Tracker

LiveSplit-style progress tracker for [MoSim](https://mosimulator.com/modding/) robot mods.
Track robots through the community-tracker statuses (Planned → In Unity →
Semi-Functional → Released), check off modding steps in any order, keep notes, link each
robot to the repo it lives in, generate robot scripts with AI, and mark anything private
so it's only visible when you're signed in with Google.

The split template is derived from the official docs
([modding intro](https://docs.mosimulator.com/modding/intro) + the
[9496 Lynk walkthrough](https://docs.mosimulator.com/modding/lynk-walkthrough/model-prep)):
10 steps (Model Prep → Build & Ship) with concise sub-steps, each linking back to its docs
page. Edit `steps.json` at the repo root to change your workflow.

```
steps.json  Shared split template (web + desktop both read this)
web/        React + Vite web UI
app/        Python always-on-top desktop app (no Electron needed)
server/     Static host for a DigitalOcean droplet (see server/DEPLOY.md)
firestore.rules / firestore.indexes.json / firebase.json   Firebase config
```

## Quick start (local mode — no account needed)

```powershell
# 1. Build the web app
cd web
npm install
npm run build
cd ..

# 2. Launch the desktop app (Python, always-on-top, LiveSplit-style)
pip install pywebview
python app/main.py
```

For the web UI in a browser instead: `cd web && npm run dev` then open http://localhost:5173.

In local mode everything is saved on that device only. The banner reminds you of this.

## Pages

- **Robots** — spreadsheet-style table like the community tracker: colored Status and
  Mod Type pills, modpack, repo, progress, comments. No search bar; filter chips instead.
  "In Unity" rows show which step you're on. Click a row for the splits view.
- **Robot detail** — the splits: 10 steps / 53 sub-steps checkable in any order, a note
  box per step, "Left to do" panel, overall notes, repo link, and the AI script generator.
- **Scripts** — your personal .cs library. Drag scripts in; the AI generator feeds
  all of them to the model as examples. Export as JSONL to train your own model
  (see [TRAINING.md](TRAINING.md)).
- **Planned** — robots you intend to make + their future modpacks. "Start modding →"
  promotes one to In Unity.
- **Modpacks** — packs your robots ship in. Private pack ⇒ every robot inside is hidden too.
- **Repos** — the git repos your mods live in (local path + GitHub URL). From the desktop
  app, **Scan** finds every robot folder (anything under `Assets/**/Robots/**` containing a
  `.prefab`) with its last git commit date and its `.cs` scripts. Results are cached so the
  web UI shows them too.
- **Compact** — the LiveSplit-style column (what the desktop app shows). `/#/compact` in
  any browser.

Themes: the 🌙/☀️/☁️ button in the top bar cycles **Dark → Light → Cloud** (soft blue).

## AI script generator

On a robot's page (when you can edit): describe the robot's functionality, paste match /
reveal video links, tick past scripts from the linked repo (desktop app reads them off
disk; in a browser you can paste one), and it asks Claude to write the robot's C# script
using the real MoSim APIs (`ReefscapeRobotBase`, `GenericJoint`, game piece controllers…).

- You need an [Anthropic API key](https://console.anthropic.com/). It's stored **only in
  that device's localStorage** — never synced anywhere.
- Honest limitation: the API cannot watch videos. The links are kept as reference; your
  written description of the mechanisms is what drives the generated script.

## Cloud mode (sync + Google sign-in + private robots)

1. Create a project at https://console.firebase.google.com (free Spark plan is plenty).
2. **Authentication → Sign-in method → Google → Enable.**
3. **Firestore Database → Create database** (production mode).
4. **Project settings → Your apps → Web app (</>)** — register an app and copy the config
   object into `web/src/firebase-config.ts` (replace the `null`).
5. Deploy the security rules + indexes (this is what actually enforces "private needs
   sign-in"):
   ```powershell
   npm install -g firebase-tools
   firebase login
   firebase use <your-project-id>
   firebase deploy --only firestore
   ```
6. Rebuild: `cd web; npm run build`. The desktop app now syncs through Firestore.

### How privacy works

- Every robot, modpack and repo has a **Private** toggle (web and app).
- A private **modpack** also hides every robot inside it.
- Enforcement lives in `firestore.rules`, not just the UI: anonymous visitors can only
  read documents with `private == false`; private ones require signing in as the owner.
- By default any Google account can *create* data in your project (they still can't read
  or touch yours). To lock writes to just you, see the comment in `firestore.rules`.

## Hosting on your DigitalOcean droplet (subdomain)

See **[server/DEPLOY.md](server/DEPLOY.md)** — build, `scp` the `server/` folder + build
to the droplet, systemd service, nginx config for `mods.yoursite.com`, certbot HTTPS, and
adding the domain to Firebase's authorized list. The droplet holds no data (everything is
in Firebase), so redeploys are risk-free. Firebase Hosting (`firebase deploy --only
hosting`) also works if you ever want a zero-server option.

## Desktop app (Windows / macOS / Linux)

A plain Python script — no Electron, no Node, no extra runtime.

```powershell
# One-time install
pip install pywebview

# Launch (from repo root)
python app/main.py
# — or double-click app/run.bat on Windows, app/run.sh on Mac/Linux
```

- Opens in **compact mode** (360 × 640, always on top) — the LiveSplit-style splits view.
- 📌 in the title bar toggles always-on-top.
- ⛶ expands to the full 1000 × 800 UI without opening a browser.
- ✕ closes the window.
- Serves `web/dist/` on a random localhost port, so Google sign-in works inside it.
- Repo scanning (finding robot folders + reading .cs files from disk) works the same
  as the old Electron app — the Python process has OS access.

**Prerequisites:** Python 3.8+, `pywebview` (`pip install pywebview`), and
`web/dist/` must exist (`npm run build` in `web/` first).

On Windows, pywebview uses the system WebView2 (Edge-based, ships with Windows 11).
On macOS it uses WKWebView. On Linux it uses GTK WebKit.
