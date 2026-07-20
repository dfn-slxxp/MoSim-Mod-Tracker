## Approach
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- Skip files over 100KB unless required.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.


# MoSim Mod Tracker — AI Context File

> **Keep this file up to date.** Every time a file is added, removed, or significantly changed, update the relevant section AND mirror the change into `ai_context.txt` (plain-text copy for other AI tools). Read this at the start of every session.

---

## Project Overview

**MoSim Mod Tracker** is a personal LiveSplit-style progress tracker for making FRC robot mods in MoSim (a Unity-based FRC robot simulator). Users track which team robots they are modding, step through a configurable workflow, and share their progress publicly.

**Architecture:** Tauri 2.x desktop app + web-accessible backend.

- **Desktop (Tauri):** Rust backend, React/TypeScript frontend served via Vite. Runs as a native Windows/macOS/Linux app.
- **Web:** Same React frontend, served by an Express server with SQLite. Accessible at `https://mods.sebastianw.tech`.
- **Backend domain hardcoded** to `https://mods.sebastianw.tech` in `src-tauri/src/config.rs` (`DEFAULT_SERVER`).
- **Auth:** Google OAuth. Web uses httpOnly cookie JWT. Desktop uses deep-link `mosim://auth?token=...` → stores Bearer token in `localStorage`.
- **Admin:** email allowlist (`ADMIN_EMAILS` env, default `waldman.sebastian@gmail.com`). Admins get a hidden `/#/admin` dashboard: workflow-steps editor + custom themes editor. Both are stored server-side and apply to every device.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop wrapper | Tauri 2.x (Rust) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Plain CSS with CSS variables (3 built-in themes + server-stored custom themes) |
| Backend | Node.js + Express |
| Database | SQLite via `better-sqlite3` |
| Auth | Google OAuth 2.0 + JWT |
| AI | Gemini (video analysis, default) + Anthropic API + optional local Ollama |
| CI/CD | GitHub Actions → GitHub Releases (two-release structure, see CI section) |
| Installer | Custom Tauri app (`installer-app/`) with purple cloud UI |

---

## Repository Layout

```
MoSim Mod Tracker/
├── CLAUDE.md                    ← THIS FILE (AI context; mirror edits into ai_context.txt)
├── ai_context.txt               ← Plain-text mirror of this file for other AI tools
├── package.json                 ← Root npm: Tauri CLI dev dependency
├── steps.json                   ← BUNDLED DEFAULT workflow. Admin-edited copy on the
│                                   server (settings table) wins when present.
│
├── src-tauri/                   ← Main Tauri app (desktop)
│   ├── Cargo.toml               ← deps incl. tauri-plugin-single-instance (required!)
│   ├── tauri.conf.json          ← productName "MoSim Mod Tracker", 360×640, CSP has
│   │                               img-src https: (Google profile pictures)
│   ├── capabilities/default.json
│   └── src/
│       ├── lib.rs               ← Tauri builder. Plugin order matters:
│       │                           single-instance BEFORE deep-link (Windows routes
│       │                           mosim:// URLs to the running instance)
│       ├── main.rs              ← calls lib::run()
│       ├── commands.rs          ← invoke commands (scan_repo, read_script, open_path…)
│       └── config.rs            ← const DEFAULT_SERVER = "https://mods.sebastianw.tech"
│
├── web/                         ← Frontend React app (desktop + web)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html               ← favicon link (/favicon.png)
│   ├── public/favicon.png       ← avatar as favicon
│   └── src/
│       ├── App.tsx              ← Routes + Shell. Nav: Robots, Modpacks, Repos,
│       │                           Scripts, Compact. Hidden routes: /planned, /admin
│       ├── main.tsx             ← HashRouter > ThemeProvider > StoreProvider > App
│       ├── types.ts             ← ALL shared types: RobotStatus, ModType, GAMES,
│       │                           Robot/Modpack/Repo/ScriptDoc, UserInfo (admin flag),
│       │                           CustomTheme, normalizeRobot()
│       ├── steps.ts             ← MUTABLE STEPS array. loadRemoteSteps(base) fetches
│       │                           /api/steps on startup and splices in-place;
│       │                           applySteps() used by admin editor. totalSubs()
│       │                           recomputes (no static TOTAL_SUBS anymore).
│       ├── styles.css           ← All CSS. Themes = CSS vars on :root[data-theme='x'].
│       │                           Custom themes injected as a <style> tag at runtime.
│       ├── theme.tsx            ← BUILTIN_THEMES (dark/light/cloud) + custom themes
│       │                           fetched from /api/themes; injectCustomThemes();
│       │                           useTheme() exposes allThemes/customThemes/setCustomThemes
│       ├── assets/avatar.png    ← Pixel-art avatar (app logo)
│       ├── ai/
│       │   ├── client.ts        ← 3 providers: gemini (watches YouTube via fileData),
│       │   │                       anthropic, ollama. generateScript(), analyzeScript()
│       │   │                       (bullet-point script description), providerConfigured()
│       │   └── reference.ts     ← MoSim system prompt
│       ├── components/
│       │   ├── AiScriptPanel.tsx  ← AI script generator; provider picker incl. Gemini
│       │   ├── AuthButton.tsx     ← Sign in/out in topbar
│       │   ├── PillSelect.tsx     ← Colored select for status/modtype
│       │   ├── ProgressBar.tsx    ← Fill bar
│       │   ├── RobotForm.tsx      ← Add-robot: team # (TBA lookup on blur; rebuild
│       │   │                         suffixes like 9483a spliced via baseTeamNumber),
│       │   │                         game (follows modpack), modpack + inline "+ New",
│       │   │                         mod type dropdown, "Mark as complete" toggle
│       │   │                         (pre-checks all steps, status released), TBA key
│       │   ├── Splits.tsx         ← Accordion steps + Check all/Uncheck all.
│       │   │                         Checking a step header CASCADES: all earlier
│       │   │                         steps get checked too (uncheck never cascades)
│       │   ├── Dialog.tsx         ← DialogProvider + useDialog(): custom
│       │   │                         confirmDialog/alertDialog replacing every
│       │   │                         native confirm()/alert() in the app
│       │   └── Select.tsx         ← Fully custom dropdown replacing EVERY native
│       │                             <select>: portal menu (never clipped), groups,
│       │                             pill color classes, Escape/outside/scroll close.
│       │                             PillSelect wraps it. Never add a raw <select>.
│       ├── lib/
│       │   ├── desktop.ts        ← window.desktop bridge; isTauri, getServerUrl…
│       │   └── tba.ts            ← TBA API: getTbaKey, setTbaKey, fetchTeamName
│       ├── pages/
│       │   ├── HomePage.tsx      ← PUBLIC landing (/, /home on web). MoSim +
│       │   │                        modding explainer + community directory
│       │   │                        (GET /api/community: users with public robots)
│       │   ├── AccountPage.tsx   ← /account: edit display name + Instagram/Discord
│       │   │                        handles (PUT /api/profile). ProfileForm shared
│       │   │                        with the first-time setup modal
│       │   ├── RobotsPage.tsx    ← Two tabs (In Progress / All), filter + sort.
│       │   │                        In Progress = status != planned OR progress > 0
│       │   ├── RobotDetailPage.tsx ← Metadata, splits, AI panel. Status UPGRADE
│       │   │                         auto-checks all sub-steps (keeps notes)
│       │   ├── AdminPage.tsx     ← /#/admin (hidden). Gated by user.admin.
│       │   │                        StepsEditor: add/remove/rename/reorder steps+subs
│       │   │                          → PUT /api/admin/steps → applySteps()
│       │   │                        ThemesEditor: custom themes (curated CSS var list,
│       │   │                          color pickers, dark/light bases, preview)
│       │   │                          → PUT /api/admin/themes → live inject
│       │   ├── PlannedPage.tsx   ← /planned (not in nav)
│       │   ├── ModpacksPage.tsx  ← Game dropdown (GAMES), pill Private/Public toggle
│       │   ├── ReposPage.tsx     ← Repo management + disk scan
│       │   ├── ScriptsPage.tsx   ← Script library. On add: AI auto-describes script
│       │   │                        (bullet points, only script-evident behavior);
│       │   │                        per-row "AI describe" re-run button; JSONL export
│       │   └── CompactPage.tsx   ← Overlay (/compact). Pin button: grayscale when
│       │                            unpinned, accent highlight when pinned.
│       │                            🏁 toggle switches to RUN MODE (LiveSplit-style:
│       │                            current step ±2, next-sub quick-check button;
│       │                            persisted in localStorage mosim-compact-view)
│       └── store/
│           ├── StoreContext.tsx  ← React context; useStore()
│           ├── backend.ts        ← Backend interface + StoreState
│           └── http.ts           ← HTTPBackend. _initAsync awaits loadRemoteSteps
│                                    before first load
│
├── server/                      ← Express backend (droplet: /apps/mosim-tracker-server)
│   ├── server.js                ← Entry: express, compression, cookies, /api router,
│   │                               static web/dist + SPA fallback. Port 8787.
│   ├── api.js                   ← All /api/* routes. Google OAuth (login/callback,
│   │                               desktop deep-link variant), JWT (cookie + Bearer),
│   │                               CRUD factory for 4 collections, /api/data bulk.
│   │                               ADMIN_EMAILS allowlist; GET /api/steps + /api/themes
│   │                               (public); PUT /api/admin/steps|themes (admin only)
│   ├── db.js                    ← better-sqlite3. Tables: robots, modpacks, repos,
│   │                               scripts (uid-scoped JSON blobs) + settings (global
│   │                               key/value: 'steps','themes') + profiles (uid ->
│   │                               {displayName,email,photo,instagram,discord,completed,
│   │                               hidden,createdAt}). getProfile/setProfile/allProfiles/
│   │                               allRobots. DB_PATH env overrides location (droplet)
│   ├── manage.sh                ← Droplet ops: setup|deploy|restart|logs|status.
│   │                               NO SECRETS in git (empty GOOGLE_* vars = deploy
│   │                               skips .env rewrite; fill only for fresh setup).
│   │                               DB lives at /var/lib/mosim-tracker/data.db (outside
│   │                               repo tree); deploy backs it up first (last 10 kept);
│   │                               npm runs as www-data w/ local cache + install-scripts
│   │                               approve for better-sqlite3/esbuild + verify require
│   └── DEPLOY.md                ← Droplet + nginx + certbot walkthrough
│
├── installer/                   ← Shared installer assets
│   ├── generate-assets.py       ← wizard-side.bmp from avatar.png (Pillow)
│   └── assets/                  ← avatar.png, icon.png, wizard-side.bmp
│
├── installer-app/               ← Custom installer Tauri app (purple cloud UI)
│   ├── package.json             ← name "mosim-installer"
│   ├── vite.config.ts           ← server.fs.allow dev-only
│   ├── src/
│   │   ├── App.tsx              ← 4 steps (Welcome/Download/Install/Done).
│   │   │                           check_existing on load → Clean Install vs Update
│   │   ├── styles.css, main.tsx, vite-env.d.ts
│   │   └── avatar.png           ← LOCAL COPY (Vite can't cross project root in prod)
│   └── src-tauri/
│       ├── Cargo.toml           ← package "mosim-setup" (binary name; release asset
│       │                           is renamed at upload, see CI)
│       ├── tauri.conf.json      ← productName "MoSim Setup", bundle.active false
│       └── src/lib.rs           ← start_install: /releases/latest → tag → fetch
│                                   /releases/tags/{tag}-bin for the actual binaries.
│                                   Windows exe search: LOCALAPPDATA\Programs, LOCALAPPDATA,
│                                   Program Files (x86) + registry InstallLocation
│                                   fallback; 30s poll; real error if not found.
│                                   check_existing/uninstall_existing for clean installs.
│
└── .github/workflows/release.yml ← See CI/CD below
```

---

## Key Data Model

```typescript
interface Robot {
  id: string;
  name: string;       // TBA team nickname (or "Team {number}" fallback)
  team: string;       // FRC team number e.g. "9496"
  teamName?: string;  // cached TBA nickname
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
  progress: Record<string, StepProgress>;  // stepId → {subs: Record<string,bool>, note}
}

interface UserInfo { uid; name; email; photo; admin?: boolean }

interface CustomTheme {
  id: string;      // 'custom-*' prefix enforced on save
  label: string;
  icon: string;    // emoji for the theme cycle button
  vars: Record<string, string>;  // CSS var overrides WITHOUT '--' prefix
}
```

---

## Workflow Steps

`steps.json` is the bundled DEFAULT (10 steps). Admins edit the live set at `/#/admin`;
it's stored in the server `settings` table and loaded by every client on startup
(`loadRemoteSteps`). Renaming labels keeps progress (ids stable); deleting steps/subs
drops their checkmarks; new items start unchecked.

Default steps: model-prep, editor-setup, import-modpack, hierarchy, colliders, code,
editor-components, tuning, climber-polish, build-ship.

---

## Games

```typescript
export const GAMES = ['2025: Reefscape', '2026: Rebuilt'] as const;
```
Add new seasons here (types.ts). Year extracted as `game.split(':')[0].trim()`.

---

## CI/CD — release.yml (two-release structure)

Triggered by `v*.*.*` tag push. Creates TWO releases per version:

**`v1.0.0-bin` (prerelease, "internal")** — created by Job 1 (publish-tauri via
tauri-action). Contains the raw app binaries (NSIS exe, DMGs, AppImage). Marked
prerelease so `/releases/latest` never returns it and the releases page stays clean.

**`v1.0.0` (main release)** — created by Job 2 (build-installer; all 4 matrix jobs
race `gh release create || true`). Contains ONLY the custom installers:
- `MoSim-Mod-Tracker.exe` (Windows; name avoids "setup"/"install" keywords so the
  Program Compatibility Assistant doesn't complain after exit)
- `MoSim-Mod-Tracker-arm.dmg` / `MoSim-Mod-Tracker-intel.dmg` (macOS)
- `MoSim-Mod-Tracker.AppImage` (Linux)

The installer app resolves binaries via: GET /releases/latest → tag_name → GET
/releases/tags/{tag}-bin → download asset matching platform suffix
(`_x64-setup.exe`, `_aarch64.dmg`, `_x64.dmg`, `_amd64.AppImage`).

Upload steps use `shell: bash` (Windows runners default to PowerShell; `$TAG` must expand).

---

## Important Implementation Notes

### Installer App
- `bundle.active: false`; Windows uploads the raw cargo binary, macOS/Linux use `--bundles`
- `avatar.png` MUST physically exist at `installer-app/src/avatar.png` (Vite prod builds
  cannot resolve cross-project-root imports)
- NSIS `/S` can be async: poll 30s across all candidate paths, then registry, then error
- Uses tokio features: fs, io-util, process, time

### Admin System
- Server: `ADMIN_EMAILS` env (comma-separated), default owner email. `/api/me` returns
  `admin` flag. `requireAdmin` wraps `requireAuth` + allowlist check.
- Steps + themes live in the `settings` table (global, not uid-scoped).
- GET /api/steps and /api/themes are public (not secret); writes admin-only.
- Admin dashboard has a Users section: GET /api/admin/users (all users + robot
  counts + hidden), PUT /api/admin/users/:uid/visibility {hidden}.

### Account linking (multiple Google accounts)
- `account_links` table maps a secondary Google sub -> primary uid. `resolveUid(sub)`
  returns the primary (or sub itself). Every login resolves so req.user.uid is
  always the primary; all data stays under one uid.
- Link flow: POST /api/auth/link-start (authed) -> Google auth URL with
  state.link=primaryUid + prompt=select_account; frontend opens it. Callback with
  state.link records the mapping and redirects to /#/account?linked=1 (web) or
  mosim://auth?linked=1 (desktop). Account page refetches on window focus.
- Profile is refreshed ONLY on primary login (googleSub===uid) so a linked
  secondary sign-in never overwrites the primary's name/photo/email.
- /api/me returns `linked: [{sub,email}]` + `primaryEmail`; DELETE
  /api/account/links/:sub unlinks. Admin check uses the signed-in email.
- ADMIN_EMAILS default: waldman.sebastian@gmail.com, seb@sebastianw.tech.

### Profiles / Community
- Default display name is the Google FIRST name (firstName()) for new profiles;
  editable on the Account page.
- On every Google sign-in the auth callback upserts a `profiles` row (refreshes
  email/photo, never clobbers user-edited displayName/instagram/discord).
- `/api/me` includes `profile: {displayName, instagram, discord, completed}`.
- PUT /api/profile sets those + completed=true (display name required; Instagram
  stored as bare handle — @/URL stripped server-side).
- GET /api/community (PUBLIC): users with >=1 PUBLIC robot (!private &&
  !modpackPrivate) who aren't admin-hidden, with robotCount + games.
- Frontend: HomePage is public (RequireAuth wraps only the app pages). Web `/`
  → /home, desktop `/` → /robots. First-time users (completed=false) get the
  ProfileSetup modal over any page until they save.
- Instagram/Discord are HANDLE ENTRY only (not OAuth) — shown as profile links.

### Custom Themes
- Injected client-side as `<style id="mosim-custom-themes">` with
  `:root[data-theme='<id>'] { --var: value; }` blocks — behaves exactly like built-ins.
  (Undefined vars inherit the base `:root`/dark palette, so the generator emits a
  full set incl. panel-2 + all pill-* to stay cohesive.)
- Editor takes only PRIMARY + SECONDARY color + a dark/light base; `lib/color.ts`
  generateTheme(primary, secondary, mode) derives the whole palette (surfaces
  tinted toward secondary hue, text/muted for contrast, accent=primary,
  blue=secondary, semantic gold/red, status pills). CustomTheme stores
  primary/secondary/mode so the editor round-trips; vars regenerated on any change
  and before save. Verified: text/bg contrast 13–15 (AAA) across color pairs.
- Theme choice persists per-device in localStorage `mosim-theme`; falls back to dark
  if a saved custom theme was deleted.
- ThemeButton (App.tsx): LEFT-click cycles through allThemes; RIGHT-click opens a
  portal menu (.theme-menu, reuses .dd-menu/.dd-option) to pick a theme by name.

### AI
- Provider setting in localStorage. Gemini is listed first (video analysis).
- Gemini: YouTube URLs sent as `fileData` parts → the model watches them.
  Endpoint: generativelanguage.googleapis.com v1beta generateContent, key in query.
- AiScriptPanel has THREE input modes (any one drives generation): text
  description, video links, and a GitHub repo URL of the team's REAL robot code.
- `lib/github.ts` fetchRepoSource(url): parseRepoUrl → GitHub trees API (CORS ok)
  → raw.githubusercontent.com per file (CORS ok, not counted vs the 60/hr API
  limit). Filters to .java/.kt/.cpp/.h/.cs/.py, skips build/vendordeps/test/etc.,
  prioritizes subsystems/Robot/commands/Constants, caps ~30 files / 150k chars.
  Files go into GenerateInput.sourceRepo; buildPrompt asks the model to translate
  the real code into a MoSim C# script. Public repos only.
- `analyzeScript(name, content)`: bullet-point description of a .cs script, used by
  ScriptsPage auto-describe on add + per-row re-run. Only script-evident behavior.
- Anthropic: direct browser calls with `anthropic-dangerous-direct-browser-access`.

### TBA API
- Key in localStorage `mosim_tba_key`; `lib/tba.ts`
- GET thebluealliance.com/api/v3/team/frc{number}, header `X-TBA-Auth-Key`

### Auth Pattern
- Web: relative `/api/...`, cookie JWT (30 day). Desktop: absolute URLs + Bearer token
  in localStorage `mosim_token`; deep link `mosim://auth?token=...`
- `tauri-plugin-single-instance` MUST be registered before `tauri-plugin-deep-link`.
  The WARM sign-in path (app already running) is handled DIRECTLY in the
  single-instance callback: it parses argv for mosim:// URLs and emits
  mosim:auth-token itself, then unminimizes/focuses the window. Do NOT rely on
  the plugin's deep-link feature re-emitting deep-link://new-url — that path
  proved unreliable in practice (v1.0.1 bug: sign-in only worked cold).
- Cold start (browser launches the app with the URL in argv): lib.rs stashes the
  token in PendingToken state; frontend collects via take_pending_auth_token
  command in http.ts _initAsync.

### Desktop window chrome
- Main window: decorations false + transparent true (tauri.conf). The shell
  paints its own rounded chrome (.shell.is-desktop / .compact-shell: 12px
  radius, border) and a custom .app-titlebar (drag via data-tauri-drag-region;
  min/max/close via minimize_window/toggle_maximize/close_window commands).
  Pin + compact-switch + theme buttons live in the titlebar; topbar is a
  single slim row (brand hidden on desktop).
- desktop.ts stamps <html data-desktop data-pinned data-blurred>; CSS makes
  the shell background semi-transparent when pinned AND blurred (overlay feel).
- -webkit-app-region does nothing in Tauri; ONLY data-tauri-drag-region works.
- Dropdowns: global select restyle (appearance:none, pill radius, accent tint,
  SVG chevron). The open popup list remains OS-drawn.

### Windows install facts (verified on a real machine)
- Tauri NSIS (currentUser) installs to `%LOCALAPPDATA%\MoSim Mod Tracker\`
- The app binary is `mosim-mod-tracker.exe` (cargo crate name, NOT productName)
- Uninstaller is `uninstall.exe`
- Uninstall registry key: `HKCU\...\Uninstall\MoSim Mod Tracker`;
  `InstallLocation` value is QUOTED, `DisplayIcon` points straight at the exe
- Installer CSP needs `img-src ... data:` — Vite inlines images under 4KB as
  data: URIs (avatar.png is ~3.1KB) and the default CSP blocks them

### Server / Deploy
- Droplet path: `/apps/mosim-tracker-server`; systemd service `mosim-tracker`;
  nginx proxies 443→8787. Deploy: `bash server/manage.sh deploy` (as root).
- Database at `/var/lib/mosim-tracker/data.db` (OUTSIDE the repo tree; DB_PATH in
  .env). Deploy auto-backs-up to `/var/lib/mosim-tracker/backups/` (last 10).
  manage.sh migrates the old in-repo `server/data.db` automatically on first run.
- manage.sh contains NO secrets. Creds live only in `server/.env` on the droplet
  (deploy preserves it when GOOGLE_* vars are empty).
- Server-side auth env: GOOGLE_CLIENT_ID/SECRET, OAUTH_REDIRECT_URI, JWT_SECRET,
  DB_PATH, optional ADMIN_EMAILS.
- Droplet npm blocks install scripts (allowScripts): manage.sh approves
  better-sqlite3 + esbuild each deploy and verifies require('better-sqlite3').

---

## Pending / Known Issues

- Server data migration note: none needed for settings table (CREATE IF NOT EXISTS).
- After changing steps via admin, other open clients pick it up on next reload only.
- macOS/Linux installer builds are untested by the user (no hardware).

---

## Common Commands

```bash
# Dev (desktop app)
npm run tauri dev

# Build desktop app
npm run tauri build

# Web dev server only
npm --prefix web run dev

# Deploy server (droplet)
ssh root@DROPLET "bash /apps/mosim-tracker-server/server/manage.sh deploy"

# Tag a release (delete + retag pattern)
git tag -d v1.0.0; git push origin :refs/tags/v1.0.0; git tag v1.0.0; git push origin v1.0.0
```
