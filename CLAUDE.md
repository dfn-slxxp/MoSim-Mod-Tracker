# MoSim Mod Tracker — AI Context File

> **Keep this file up to date.** Every time a file is added, removed, or significantly changed, update the relevant section. Read this at the start of every session.

---

## Project Overview

**MoSim Mod Tracker** is a personal LiveSplit-style progress tracker for making FRC robot mods in MoSim (a Unity-based FRC robot simulator). Users track which team robots they are modding, step through a 10-step workflow, and share their progress publicly.

**Architecture:** Tauri 2.x desktop app + web-accessible backend.

- **Desktop (Tauri):** Rust backend, React/TypeScript frontend served via Vite. Runs as a native Windows/macOS/Linux app.
- **Web:** Same React frontend, served by an Express server with SQLite. Accessible at `https://mods.sebastianw.tech`.
- **Backend domain hardcoded** to `https://mods.sebastianw.tech` in `src-tauri/src/config.rs` (`DEFAULT_SERVER`).
- **Auth:** Google OAuth. Web uses httpOnly cookie JWT. Desktop uses deep-link `mosim://auth?token=...` → stores Bearer token in `localStorage`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop wrapper | Tauri 2.x (Rust) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Plain CSS with CSS variables (3 themes: dark, light, cloud) |
| Backend | Node.js + Express |
| Database | SQLite via `better-sqlite3` |
| Auth | Google OAuth 2.0 + JWT |
| AI | Anthropic API (claude-sonnet-5 etc.) + optional local Ollama |
| CI/CD | GitHub Actions → GitHub Releases |
| Installer | Custom Tauri app (`installer-app/`) with purple cloud UI |

---

## Repository Layout

```
MoSim Mod Tracker/
├── CLAUDE.md                    ← THIS FILE (AI context)
├── package.json                 ← Root npm: Tauri CLI dev dependency
├── steps.json                   ← 10-step workflow definition (shared by all layers)
│
├── src-tauri/                   ← Main Tauri app (desktop)
│   ├── Cargo.toml
│   ├── tauri.conf.json          ← productName: "MoSim Mod Tracker", 360×640 window
│   ├── capabilities/default.json
│   └── src/
│       ├── lib.rs               ← pub fn run(), Tauri builder
│       ├── main.rs              ← calls lib::run()
│       ├── commands.rs          ← Tauri invoke commands (scan_repo, read_script, etc.)
│       └── config.rs            ← const DEFAULT_SERVER = "https://mods.sebastianw.tech"
│
├── web/                         ← Frontend React app (used by both desktop + web)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx              ← Routes + Shell (topbar, nav). Nav: Robots, Modpacks, Repos, Scripts, Compact
│       ├── main.tsx             ← Entry: HashRouter > ThemeProvider > StoreProvider > App
│       ├── types.ts             ← ALL shared types. Key exports:
│       │                           RobotStatus ('planned'|'in-unity'|'semi-functional'|'released')
│       │                           ModType (6 values)
│       │                           Robot, Modpack, Repo, ScriptDoc interfaces
│       │                           GAMES = ['2025: Reefscape', '2026: Rebuilt']
│       │                           normalizeRobot() for legacy data migration
│       ├── steps.ts             ← robotProgress(), stepProgress() — reads steps.json
│       ├── styles.css           ← All CSS. Theme via CSS vars on :root[data-theme='...']
│       ├── theme.tsx            ← ThemeContext: dark/light/cloud
│       ├── assets/
│       │   └── avatar.png       ← Pixel-art avatar (app logo, used everywhere)
│       ├── ai/
│       │   ├── client.ts        ← Anthropic + Ollama API callers
│       │   └── reference.ts     ← MoSim system prompt (static knowledge base)
│       ├── components/
│       │   ├── AiScriptPanel.tsx  ← AI script generator (shown on robot detail page)
│       │   ├── AuthButton.tsx     ← Sign in/out in topbar
│       │   ├── PillSelect.tsx     ← Colored <select> for status/modtype
│       │   ├── ProgressBar.tsx    ← Fill bar
│       │   ├── RobotForm.tsx      ← Simplified add-robot form:
│       │   │                         - Team # input → auto-fetches TBA team name on blur
│       │   │                         - Game dropdown (GAMES constant)
│       │   │                         - Modpack dropdown
│       │   │                         - TBA key config (stored in localStorage 'mosim_tba_key')
│       │   │                         - Sets robot.name to TBA nickname or "Team {number}"
│       │   └── Splits.tsx         ← Accordion steps list + WhatsLeft sidebar
│       ├── lib/
│       │   ├── desktop.ts        ← Sets window.desktop (Tauri invoke bridge)
│       │   └── tba.ts            ← TBA API: getTbaKey, setTbaKey, fetchTeamName
│       ├── pages/
│       │   ├── RobotsPage.tsx    ← Main tracker. Two tabs:
│       │   │                         "In Progress" (excludes planned)
│       │   │                         "All" (all statuses incl. planned)
│       │   │                        Filter by: game, year, status (All tab only),
│       │   │                         progress level, team search
│       │   │                        Sort by: team#, game, progress%, status, date added + ↑↓
│       │   ├── RobotDetailPage.tsx ← Edit robot metadata, splits, AI panel
│       │   ├── PlannedPage.tsx    ← /planned route (still works, not in nav)
│       │   ├── ModpacksPage.tsx   ← Modpack CRUD
│       │   ├── ReposPage.tsx      ← Git repo management + disk scan
│       │   ├── ScriptsPage.tsx    ← Script library + JSONL export
│       │   └── CompactPage.tsx    ← LiveSplit-style always-on-top overlay (/compact)
│       └── store/
│           ├── StoreContext.tsx  ← React context; useStore() hook
│           ├── backend.ts        ← Backend interface + StoreState shape
│           └── http.ts           ← HTTPBackend: REST client, auth handling
│
├── server/                      ← Express backend (web deployment)
│   ├── index.js                 ← Entry: Express app, static file serving
│   ├── api.js                   ← All /api/* routes
│   ├── db.js                    ← SQLite setup (better-sqlite3), 4 tables
│   └── auth.js                  ← Google OAuth + JWT helpers
│
├── installer/                   ← NSIS installer assets
│   ├── generate-assets.py       ← Generates wizard-side.bmp from avatar.png (Python/Pillow)
│   └── assets/
│       ├── avatar.png           ← Source avatar (also in web/src/assets/)
│       ├── icon.png             ← App icon source
│       └── wizard-side.bmp      ← NSIS sidebar image (generated)
│
├── installer-app/               ← Custom installer Tauri app (purple cloud UI)
│   ├── package.json             ← name: "mosim-installer"
│   ├── vite.config.ts           ← server.fs.allow: ['..'] (dev only)
│   ├── src/
│   │   ├── App.tsx              ← Installer UI: 4 steps (Welcome/Download/Install/Done)
│   │   │                          - On load: calls check_existing → if found, shows
│   │   │                            "Clean Install" vs "Update" choice
│   │   │                          - Downloads latest GitHub release asset for platform
│   │   │                          - Progress bar, spinner, error state
│   │   ├── styles.css           ← Purple gradient theme, card layout, step dots
│   │   ├── main.tsx
│   │   ├── vite-env.d.ts
│   │   └── avatar.png           ← LOCAL COPY (required — Vite can't cross project root in prod)
│   └── src-tauri/
│       ├── Cargo.toml           ← name: "mosim-setup"; deps: tauri, reqwest, tokio, futures-util
│       ├── tauri.conf.json      ← productName: "MoSim Setup", 720×480, decorations: false
│       ├── capabilities/
│       └── src/
│           ├── lib.rs           ← All installer logic:
│           │                      - asset_suffix() → platform-specific file suffix
│           │                      - platform_install() → Windows: NSIS /S + poll for exe
│           │                                             macOS: hdiutil + ditto to ~/Applications
│           │                                             Linux: copy AppImage + chmod + .desktop
│           │                      - platform_launch() → open the installed app
│           │                      - platform_uninstall() → Windows: NSIS /S uninstaller
│           │                                               macOS: remove_dir_all
│           │                                               Linux: remove_file
│           │                      - check_existing() → finds existing install path
│           │                      - uninstall_existing() → calls platform_uninstall
│           │                      - start_install() → GitHub API → download → install → emit events
│           │                      - close_window(), launch_app()
│           └── main.rs
│
└── .github/
    └── workflows/
        └── release.yml          ← CI: triggers on v*.*.* tags
                                   Job 1 (publish-tauri): builds main app for all platforms
                                    → creates GitHub Release, attaches NSIS/DMG/AppImage
                                   Job 2 (build-installer): builds installer-app for all platforms
                                    → attaches MoSimSetup.exe / MoSimSetup-arm.dmg /
                                       MoSimSetup-intel.dmg / MoSimSetup.AppImage
```

---

## Key Data Model

```typescript
interface Robot {
  id: string;
  name: string;       // TBA team nickname (or "Team {number}" fallback)
  team: string;       // FRC team number e.g. "9496"
  teamName?: string;  // cached TBA nickname (same as name for new robots)
  game: string;       // "2025: Reefscape" | "2026: Rebuilt"
  status: 'planned' | 'in-unity' | 'semi-functional' | 'released';
  modType: '' | 'team-made' | 'team-approved' | 'unofficial' | 'official' | 'base-game';
  modpackId: string | null;
  repoId: string | null;
  private: boolean;
  modpackPrivate: boolean;  // denormalized from parent modpack
  ownerUid: string | null;
  notes: string;
  order: number;
  createdAt: number;
  progress: Record<string, StepProgress>;  // stepId → {subs: Record<string,bool>, note: string}
}
```

---

## steps.json — 10-Step Workflow

| # | ID | Title | Subs |
|---|---|---|---|
| 1 | model-prep | Model Prep | 5 |
| 2 | editor-setup | Editor Setup | 2 |
| 3 | import-modpack | Import & Modpack | 6 |
| 4 | hierarchy | Hierarchy Setup | 6 |
| 5 | colliders | Colliders & Physics | 5 |
| 6 | code | Robot Code | 7 |
| 7 | editor-components | Editor Components | 6 |
| 8 | tuning | Tuning & Refinement | 5 |
| 9 | climber-polish | Climber & Polish | 5 |
| 10 | build-ship | Build & Ship | 6 |

Progress stored per robot as `robot.progress[stepId] = { subs: {subId: bool}, note: string }`.

---

## Games

```typescript
export const GAMES = ['2025: Reefscape', '2026: Rebuilt'] as const;
```
Add new seasons here. Year is extracted as `game.split(':')[0].trim()`.

---

## CI/CD — release.yml

Triggered by any `v*.*.*` tag push.

**Job 1: publish-tauri** (4 matrix entries: win/mac-arm/mac-x64/linux)
- Generates assets via `installer/generate-assets.py`
- Builds main Tauri app via `tauri-apps/tauri-action@v0`
- Creates GitHub Release, attaches: `MoSim.Mod.Tracker_*_x64-setup.exe`, `*_aarch64.dmg`, `*_x64.dmg`, `*_amd64.AppImage`

**Job 2: build-installer** (4 matrix entries, depends on publish-tauri)
- Builds `installer-app/` Tauri app
- Windows: raw `mosim-setup.exe` binary → uploaded as `MoSimSetup.exe`
- macOS ARM: `--bundles dmg --target aarch64-apple-darwin` → `MoSimSetup-arm.dmg`
- macOS Intel: `--bundles dmg --target x86_64-apple-darwin` → `MoSimSetup-intel.dmg`
- Linux: `--bundles appimage` → `MoSimSetup.AppImage`
- Upload step uses `shell: bash` to ensure `$TAG` expands (Windows runners default to PowerShell)

---

## Important Implementation Notes

### Installer App (installer-app/)
- `bundle.active: false` in `tauri.conf.json` — Windows gets raw exe; macOS/Linux use `--bundles` flag
- `avatar.png` MUST be physically in `installer-app/src/avatar.png` — Vite's `server.fs.allow` is dev-only; production builds cannot resolve cross-project-root imports
- NSIS `/S` flag can be async — `platform_install` polls up to 20s for the exe to appear
- Looks for exe in two candidate paths: `%LOCALAPPDATA%\Programs\MoSim Mod Tracker\` and `%LOCALAPPDATA%\MoSim Mod Tracker\`
- `mosim.conf` is NOT written (URL hardcoded in main app at `DEFAULT_SERVER`)
- Uses `tokio::time::sleep` (requires `tokio` feature `"time"`)
- `use tauri::{Emitter, Manager}` — both required; `Manager` for `get_webview_window`

### TBA API
- Key stored in `localStorage` under `'mosim_tba_key'`
- `lib/tba.ts` exports: `getTbaKey`, `setTbaKey`, `fetchTeamName`
- Endpoint: `GET https://www.thebluealliance.com/api/v3/team/frc{number}` with `X-TBA-Auth-Key` header
- Returns `nickname` (short name) or falls back to `name`
- TBA key config: inline in RobotForm, link to `https://www.thebluealliance.com/account`

### Theme System
- CSS variables on `:root[data-theme='dark|light|cloud']`
- `theme.tsx` manages state, stamps `data-theme` on `<html>`
- Cloud theme: purple gradient topbar (`#5b21b6 → #4338ca → #2563eb`), glassmorphism cards

### Auth Pattern
- Web: relative `/api/...` URLs, cookie JWT (30 day)
- Desktop: absolute `${serverUrl}/api/...`, Bearer token in localStorage `mosim_token`
- Deep link `mosim://auth?token=...` for desktop OAuth callback
- `tauri-plugin-single-instance` is required before `tauri-plugin-deep-link` in `lib.rs`. Without it, Windows launches a new app instance for the `mosim://` URL instead of routing to the running one, causing sign-in to open a new window that never resolves

### Data Storage (server)
- SQLite, 4 tables: `robots`, `modpacks`, `repos`, `scripts`
- Schema: `id TEXT PK, uid TEXT, data TEXT (JSON blob), ord REAL, created_at INTEGER`
- All rows user-scoped by `uid`
- `GET /api/data` bulk-fetches all 4 collections in one call

---

## Pending / Known Issues

- **Rename installer binaries**: User wants `MoSimModTracker.exe` instead of `mosim-setup.exe` / `MoSimSetup.exe`. Requires updating `Cargo.toml` package name and CI artifact paths. **Not built yet.**
- **v1.0.0 tag needs retag**: The tag currently points to old commit. After `avatar.png` commit (`cf56b1f`), need to delete and recreate the tag.

---

## Common Commands

```bash
# Dev (desktop app)
npm run tauri dev

# Build desktop app
npm run tauri build

# Web dev server only
npm --prefix web run dev

# Generate icons from installer/assets/icon.png
npm run tauri -- icon installer/assets/icon.png

# Tag a release
git tag v1.0.0 && git push origin v1.0.0

# Delete and retag
git tag -d v1.0.0 && git push origin :refs/tags/v1.0.0 && git tag v1.0.0 && git push origin v1.0.0
```
