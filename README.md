# MoSim Mod Tracker

LiveSplit-style progress tracker for [MoSim](https://mosimulator.com/modding/) robot mods.
Sign in with Google → your data syncs across every device (browser, desktop app, phone).

Tracks robots through **Planned → In Unity → Semi-Functional → Released**, with
10 steps / 53 sub-steps derived from the official MoSim docs
([modding intro](https://docs.mosimulator.com/modding/intro) + [9496 Lynk walkthrough](https://docs.mosimulator.com/modding/lynk-walkthrough/model-prep)).
Edit `steps.json` at the repo root to change your workflow.

```
steps.json    Shared split template (web + desktop both read this)
web/          React + Vite frontend (runs in browser and inside the Tauri app)
src-tauri/    Rust Tauri shell — builds the native desktop app
server/       Express REST API + SQLite + Google OAuth
```

All data is stored in a SQLite database (`server/data.db`) on your own server.
No Firebase, no third-party database service.

---

## Documentation

| Guide | Contents |
|-------|----------|
| [Server Setup](docs/server-setup.md) | Deploy the server to a DigitalOcean droplet with nginx + HTTPS |
| [App Installation](docs/app-install.md) | Install the desktop app on Windows, macOS, or Linux |
| [AI Model Training](TRAINING.md) | Fine-tune a local Ollama model on your script library |
| [Development](docs/development.md) | Run everything locally for development |

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

A native app built with [Tauri](https://tauri.app) (Rust + local WebView). The UI renders
from a bundled local build — no loading screens, no dependency on the server being up to
see the interface.

Download the latest installer from the [Releases page](https://github.com/dfn-slxxp/mosim-mod-tracker/releases)
and see [docs/app-install.md](docs/app-install.md) for platform-specific instructions.

- Starts in **compact mode** (360 × 640, always on top) — the LiveSplit overlay
- 📌 toggles always-on-top. ⛶ expands to full UI. ✕ closes
- From the Repos page, **Scan** reads your local git repo folders for robot prefabs

During first setup the installer asks for your server URL. You can change it later by
editing `mosim.conf` next to the app executable.

---

## Deploying the server

See **[docs/server-setup.md](docs/server-setup.md)** for a full step-by-step guide covering:

- Creating Google OAuth credentials
- Creating and configuring a DigitalOcean droplet
- Automated setup via `server/manage.sh`
- nginx reverse proxy + subdomain + free HTTPS via certbot

**Quick deploy after initial setup:**
```bash
sudo bash server/manage.sh deploy   # git pull + rebuild + restart
sudo bash server/manage.sh logs     # tail live logs
```

---

## Privacy

Every robot, modpack, and repo has a **Private** toggle. The server only returns your own
data — all endpoints require sign-in and filter by your Google account.
