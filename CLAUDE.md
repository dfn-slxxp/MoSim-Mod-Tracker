## Approach
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- Skip files over 100KB unless required.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.
- After every substantive user message or completed work item, update this file
  (`CLAUDE.md`) — Session Notes at minimum, plus any section whose facts changed
  (repository layout, data model, implementation notes) — so it stays the single
  authoritative AI context file (no separate `AI_CONTEXT.txt` mirror is kept).
- After every user message, append a portable, decision-focused entry to
  `AI_ACTIVITY_LOG.md`: exact user request, visible work, important decisions,
  verification, files changed, and user-facing result. It must not contain hidden
  chain-of-thought, secrets, or credential values.
- Do both of the above updates as part of completing the work item itself, not as
  an afterthought the user has to request separately.


# MoSim Mod Tracker — AI Context File

> **Keep this file up to date.** Every time a file is added, removed, or significantly changed, update the relevant section. This is the single authoritative AI context file (no separate `AI_CONTEXT.txt` mirror). Read this at the start of every session.

---

## Project Overview

**MoSim Mod Tracker** is a personal LiveSplit-style progress tracker for making FRC robot mods in MoSim (a Unity-based FRC robot simulator). Users track which team robots they are modding, step through a configurable workflow, and share their progress publicly.

### Local Claude history (optional context)

Previous Claude conversations are stored under
`C:\Users\Seb\.claude\projects\C--Users-Seb-Desktop-Merch-MerchSite` despite the
folder name. It is a mixed store: the MoSim Mod Tracker history includes the initial
build/Tauri migration/deployment work (notably sessions `8ed9b53f`, `01310bed`, and
`09f3c293`), while other files cover an unrelated MerchSite and standalone turret
experiments. Identify a conversation from its content, not the enclosing folder name.
Older history includes superseded Firebase, Electron, and early installer details;
the current repository code and this handoff file are authoritative.

**Architecture:** Tauri 2.x desktop app + web-accessible backend.

- **Desktop (Tauri):** Rust backend, React/TypeScript frontend served via Vite. Runs as a native Windows/macOS/Linux app.
- **Web:** Same React frontend, served by an Express server with SQLite. Accessible at `https://mods.sebastianw.tech`.
- **Backend domain hardcoded** to `https://mods.sebastianw.tech` in `src-tauri/src/config.rs` (`DEFAULT_SERVER`).
- **Auth:** Google OAuth (required) + optional GitHub and Discord OAuth (enabled per-provider when their env creds exist; GET /api/auth/providers drives the login buttons). Web uses httpOnly cookie JWT. Desktop uses deep-link `mosim://auth?token=...` → stores Bearer token in `localStorage`.
- **Admin:** email allowlist (`ADMIN_EMAILS` env, default `waldman.sebastian@gmail.com`). Admins get a `/#/settings` page (nav-linked for admins only; `/#/admin` redirects here). Tabs: Themes (theme picker + color export/import + custom-theme editor), Workflow steps, Users. Steps + custom themes are stored server-side and apply to every device.

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
├── CLAUDE.md                    ← THIS FILE (single authoritative AI context file)
├── AI_ACTIVITY_LOG.md            ← Append-only cross-AI session/work log; see its rules
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
│       ├── App.tsx              ← Routes + Shell. Nav: Home, Robots, Modpacks,
│       │                           Repos, Scripts, Compact + admin-only Settings.
│       │                           ThemeButton right-click menu is now SELECTION-
│       │                           ONLY (export/import moved to Settings > Themes).
│       │                           Hidden route: /planned. /admin redirects to /settings.
│       ├── main.tsx             ← HashRouter > ThemeProvider > StoreProvider > App
│       ├── types.ts             ← ALL shared types: RobotStatus, ModType, GAMES,
│       │                           Robot/Modpack/Repo/ScriptDoc, UserInfo (admin flag),
│       │                           CustomTheme, normalizeRobot()
│       ├── steps.ts             ← MUTABLE STEPS array. loadRemoteSteps(base) fetches
│       │                           /api/steps on startup and splices in-place;
│       │                           applySteps() used by admin editor. totalSubs()
│       │                           recomputes (no static TOTAL_SUBS anymore).
│       ├── styles.css           ← All CSS. Palettes via :root[data-theme='x']
│       │                           + brightness via :root[data-color-mode='dark|light'].
│       │                           Custom themes injected as a <style> tag at runtime.
│       │                           UI typeface: self-hosted IBM Plex Sans variable
│       │                           (@font-face -> /fonts/plex-sans-var.woff2), Segoe
│       │                           UI fallback. Numeric readouts (team #, progress)
│       │                           use font-variant-numeric: tabular-nums.
│       ├── theme.tsx            ← BUILTIN_THEMES (default/cloud) + custom themes;
│       │                           separate colorMode (dark/light); injectCustomThemes()
│       │                           emits both modes per custom theme; useTheme()
│       ├── assets/avatar.png    ← Pixel-art avatar (app logo)
│       ├── ai/
│       │   ├── client.ts        ← Multi-provider client (openrouter/gemini/anthropic/
│       │   │                       ollama) used ONLY by ScriptsPage's "AI describe"
│       │   │                       auto-summary now (analyzeScript(), providerConfigured()).
│       │   │                       No longer calls a provider to generate scripts.
│       │   ├── promptBuilder.ts ← buildRobotPrompt(): pure, no network calls. Assembles
│       │   │                       the copy-pasteable AI prompt (task directions +
│       │   │                       reference-only source) used by AiScriptPanel.
│       │   └── reference.ts     ← MoSim system prompt, embedded verbatim into built prompts
│       ├── components/
│       │   ├── AiScriptPanel.tsx  ← AI PROMPT BUILDER (robot detail page). Does NOT call
│       │   │                         any AI itself — assembles one self-contained prompt
│       │   │                         (buildRobotPrompt) from: manual description, the
│       │   │                         team's real GitHub repo (fetchRepoSource, embedded
│       │   │                         reference-only), a local RobotFramework checkout
│       │   │                         (desktop-only, per-device path via lib/frameworkPath.ts,
│       │   │                         listed with the list_cs_files Tauri command, embedded
│       │   │                         reference-only), and the user's saved script-library
│       │   │                         entries (linked via GET /api/scripts/:id/raw, not
│       │   │                         pasted inline). Result is saved to robot.aiPrompt via
│       │   │                         updateRobot, so it persists server-side across reloads
│       │   │                         and cache clears, not just localStorage. No video-link
│       │   │                         feature (removed).
│       │   ├── AuthButton.tsx     ← Sign in/out in topbar
│       │   ├── PillSelect.tsx     ← Colored select for status/modtype
│       │   ├── ProgressBar.tsx    ← Fill bar
│       │   ├── RobotForm.tsx      ← Add-robot: team # (TBA lookup on blur via
│       │   │                         the server proxy; rebuild suffixes like
│       │   │                         9483a spliced via baseTeamNumber), game
│       │   │                         (follows modpack), modpack + inline "+ New",
│       │   │                         mod type dropdown, "Mark as complete" toggle
│       │   │                         (pre-checks all steps, status released)
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
│       │   ├── desktop.ts        ← window.desktop bridge; isTauri, getServerUrl,
│       │   │                        listCsFiles(folderPath) (generic recursive .cs scan)
│       │   ├── frameworkPath.ts  ← Per-device localStorage path to the user's local
│       │   │                        RobotFramework source checkout (AI Prompt Builder)
│       │   └── tba.ts            ← TBA API: getTbaKey, setTbaKey, fetchTeamName
│       ├── pages/
│       │   ├── HomePage.tsx      ← PUBLIC landing (/, /home on web). MoSim +
│       │   │                        modding explainer + community directory
│       │   │                        (GET /api/community: users with public robots)
│       │   ├── AccountPage.tsx   ← /account: edit display name + Instagram/Discord
│       │   │                        handles (PUT /api/profile). ProfileForm shared
│       │   │                        with the first-time setup modal
│       │   ├── RobotsPage.tsx    ← Two tabs (In Progress / All), filter + sort,
│       │   │                        one table PER GAME (color-coded heading, year/
│       │   │                        title split into spans). No Mod Type column.
│       │   │                        Game pill + Repo cell both color-coded/button.
│       │   │                        Progress column = bar + status pill combined;
│       │   │                        status auto-derives from progress (deriveStatus:
│       │   │                        0%=planned, 100%=released, else in-unity, except
│       │   │                        semi-functional which is manual/sticky) via a
│       │   │                        useEffect that persists drift; picking a status
│       │   │                        manually cascades progress like RobotDetailPage's
│       │   │                        upgrade logic. Default sort: newest game year
│       │   │                        first, then team # ascending (no Game sort option
│       │   │                        — redundant with per-game tables). In Progress =
│       │   │                        status != planned OR progress > 0
│       │   ├── RobotDetailPage.tsx ← Metadata, splits, AI panel. Status UPGRADE
│       │   │                         auto-checks all sub-steps (keeps notes)
│       │   ├── SettingsPage.tsx  ← /#/settings and /#/settings/:tab (ADMIN-ONLY,
│       │   │                        gated by user.admin; absorbs the old /admin).
│       │   │                        Nav-linked (admin only). Tabbed (.tab-bar):
│       │   │                          themes | steps | users. /settings redirects
│       │   │                          to /settings/themes.
│       │   │                        Themes tab: ThemePicker (active-theme grid +
│       │   │                          color-mode toggle + "Copy colors as JSON"
│       │   │                          export via exportThemeColors + inline
│       │   │                          "Import colors from JSON" + imported-theme
│       │   │                          delete) THEN ThemesEditor (custom themes,
│       │   │                          primary/secondary pickers, preview) →
│       │   │                          PUT /api/admin/themes → live inject.
│       │   │                        Steps tab: StepsEditor → PUT /api/admin/steps
│       │   │                          → applySteps(). Users tab: UsersEditor
│       │   │                          (GET /api/admin/users, visibility toggle).
│       │   ├── PlannedPage.tsx   ← /planned (not in nav)
│       │   ├── ModpacksPage.tsx  ← Game dropdown (GAMES), pill Private/Public toggle
│       │   ├── ReposPage.tsx     ← Repo management + disk scan. Repo record has
│       │   │                        NO local path (per-device, lib/repoPaths.ts,
│       │   │                        localStorage). Scan autolinks detected folders
│       │   │                        to matching tracked robots when unambiguous.
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
│   │                               (public); PUT /api/admin/steps|themes (admin only).
│   │                               GET /api/scripts/:id/raw (PUBLIC, unguessable UUID —
│   │                               same trust model as /robot/:id and /u/:uid) returns a
│   │                               saved script's raw text/plain content, so a built AI
│   │                               prompt can link to it instead of pasting it inline.
│   ├── db.js                    ← better-sqlite3. Tables: robots, modpacks, repos,
│   │                               scripts (uid-scoped JSON blobs) + settings (global
│   │                               key/value: 'steps','themes') + profiles (uid ->
│   │                               {displayName,email,photo,instagram,discord,completed,
│   │                               hidden,createdAt}). getProfile/setProfile/allProfiles/
│   │                               allRobots. getById(table,id): row by id, no uid check
│   │                               (backs the public /api/scripts/:id/raw route). DB_PATH
│   │                               env overrides location (droplet)
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
  aiPrompt?: string;  // last built AI prompt (see AI Prompt Builder), persisted server-side
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

`steps.json` is the bundled DEFAULT (10 steps). Admins edit the live set at `/#/settings/steps`;
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

Latest workflow tag requested: `v1.5.3` (2026-07-20).

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
- The admin UI is `/#/settings` (SettingsPage.tsx), a tabbed page (Themes / Workflow
  steps / Users), gated on user.admin. The Users tab: GET /api/admin/users (all users
  + robot counts + hidden), PUT /api/admin/users/:uid/visibility {hidden}. `/#/admin`
  redirects to `/#/settings`; a "Settings" nav link shows only for admins.

### Account linking (multiple providers: Google, GitHub, Discord)
- Identity subjects: bare Google sub (legacy) or prefixed `github:<id>` /
  `discord:<id>`. `providerOf(sub)` in api.js derives the provider from the
  prefix. `account_links` maps a secondary subject -> primary uid (column is
  still named google_sub; it stores any subject). `resolveUid(sub)` returns the
  primary (or sub itself). Every login resolves so req.user.uid is always the
  primary; all data stays under one uid.
- All three providers share one callback tail: `finishAuth(res, statePayload,
  ident)` (link-merge or login+session). Google callback at /api/auth/callback;
  GitHub at /api/auth/callback/github (scope read:user user:email, /user +
  /user/emails, primary verified email preferred); Discord at
  /api/auth/callback/discord (scope identify email, /users/@me, email only if
  verified, CDN avatar URL). Both use global fetch (Node 18+).
- GitHub/Discord are optional: enabled only when GITHUB_/DISCORD_CLIENT_ID+SECRET
  env vars exist. Their redirect URIs are derived: OAUTH_REDIRECT_URI + /github
  or /discord. GET /api/auth/providers (public) reports availability; the UI
  (SignInGate, AuthButton, AccountPage) only shows configured providers via
  useAuthProviders() (web/src/lib/useAuthProviders.ts).
- Login: GET /api/auth/login?provider=github|discord (no provider = Google).
  Link flow: POST /api/auth/link-start {provider} (authed) -> provider auth URL
  with state.link=primaryUid; frontend opens it. Callback with state.link
  merges + records the mapping and redirects to /#/account?linked=1 (web) or
  mosim://auth?linked=1 (desktop). Account page refetches on window focus.
- Profile is refreshed ONLY on primary login (subject===uid) so a linked
  secondary sign-in never overwrites the primary's name/photo/email. A GitHub
  or Discord first sign-in creates a fresh account (name/avatar from provider;
  email may be null).
- /api/me returns `linked: [{sub,email,provider}]` + `primaryEmail` + `provider`
  (primary's); DELETE /api/account/links/:sub unlinks. Admin check uses the
  signed-in email. Accounts are NEVER auto-merged by matching email (account
  takeover risk); linking is always explicit.
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

### Motion / animation (Emil Kowalski standards)
- Tokens in styles.css `:root`: `--ease-out` cubic-bezier(0.23,1,0.32,1),
  `--ease-in-out`, durations `--dur-press` 160ms / `--dur-fast` 130ms /
  `--dur-menu` 160ms / `--dur-modal` 220ms. Use these, don't hand-roll curves.
- Press feedback: `transform: scale(0.97)` on `:active` of buttons/pressables,
  transition transform 160ms ease-out (skips :disabled).
- Dropdowns (Select.tsx + theme menu): render into a fixed `.dd-anchor` wrapper
  (holds position + up-flip translate) containing `.dd-menu` which owns the
  entrance — `transform-origin: top/bottom left` (scales FROM the trigger),
  `@keyframes dd-open` scale(0.96)+opacity, 160ms ease-out. Never scale from center.
- Modals (`.dialog-*`): center origin (correct for centered modals), 220ms ease-out.
- ProgressBar animates `transform: scaleX()` (GPU), not width. Community/home cards
  fade-up with 45–60ms stagger (`card-in`, `backwards` fill so hover still works).
- Global `@media (prefers-reduced-motion: reduce)` kills movement (press scale,
  hover lift, entrance transforms) but keeps opacity/color feedback. Hover lift is
  gated behind `@media (hover:hover) and (pointer:fine)`.

### Custom Themes
- Injected client-side as `<style id="mosim-custom-themes">` with
  `:root[data-theme='<id>'][data-color-mode='dark|light'] { --var: value; }` blocks
  for both brightness modes (regenerated from primary/secondary at inject time).
- Editor takes PRIMARY + SECONDARY color; `lib/color.ts` generateTheme(primary,
  secondary, mode) derives the whole palette with Cloud-theme-level color presence.
  CustomTheme stores primary/secondary; vars are runtime-generated for each color mode.
- Palette choice persists in localStorage `mosim-theme` (default | cloud | custom-*);
  brightness persists in `mosim-color-mode` (dark | light). Legacy saves where
  dark/light were theme ids migrate to default + color mode. Falls back to default
  if a saved custom theme was deleted.
- App.tsx titlebar: ColorModeButton (🌙/☀️ toggle) + ThemeButton (LEFT-click cycles
  allThemes; RIGHT-click portal menu). The right-click menu is now SELECTION-ONLY
  (just the theme list) — the export/import/delete affordances moved to
  Settings > Themes (SettingsPage.tsx ThemePicker). Select.tsx dropdowns scroll
  inside the menu without closing (page scroll still closes).
- Export ("Copy colors as JSON", in Settings > Themes) calls
  `exportThemeColors(theme, customThemes, allThemes)` (theme.tsx) which returns a
  ONE-ELEMENT ARRAY `[{name, primary, secondary}]` — name = the theme's label,
  primary/secondary = the stored custom seeds, else the live `--accent`/`--blue` for
  built-ins. The full palette is regenerated from the pair via generateTheme() on
  re-import, so a round-trip reproduces both modes. The array shape lets several
  themes be pasted at once.
- Import ("Import colors from JSON", inline textarea in Settings > Themes).
  `parseThemeImport(text)` (theme.tsx) returns `ParsedTheme[]` and prefers the
  exported array `[{name, primary, secondary}]` (hex-validated seed pairs), also
  accepts a single seed-pair object `{name?, primary, secondary}`, and still accepts a
  bare/legacy `{bg, accent, ...}` map (drops unknown keys, rejects values with
  `{}<>;`, requires >= bg or accent). `importTheme(text)` returns `ImportedTheme[]`
  (imports every parsed entry; the picker selects the first). `injectImportedThemes()` writes
  `<style id=mosim-imported-themes-style>`: a seed pair emits per-mode
  `[data-color-mode]` blocks; a legacy map emits one mode-agnostic block with
  `--bg-image: none`. Imported themes persist in localStorage `mosim-imported-themes`,
  appear in allThemes with a 📥 icon, and are deletable in Settings > Themes. These
  are LOCAL/per-device (not the server-stored admin custom themes). useTheme() exposes
  importedThemes/importTheme/removeImportedTheme.

### AI Prompt Builder (robot detail page, `AiScriptPanel.tsx`)
- Does NOT call any AI provider. `ai/promptBuilder.ts` `buildRobotPrompt()` is a pure
  function that assembles ONE self-contained text prompt the user copies into any AI
  model's chat box themselves. Sections: `## Task` (rules) + `## MoSim scripting rules`
  (MOSIM_SYSTEM_PROMPT embedded verbatim) + `## What this robot needs to do` (the
  manual description), then a `# Reference material below (context only)` banner
  followed by reference-only source groups — explicitly marked as not-to-copy-verbatim.
- Reference sources, all optional and combinable:
  1. The team's real robot GitHub repo — fetched live via `lib/github.ts`
     `fetchRepoSource(url)` (same fetch as before), embedded inline.
  2. A local RobotFramework checkout — desktop-only. Path is per-device
     (`lib/frameworkPath.ts`, localStorage `mosim-framework-path`), scanned with the
     Tauri `list_cs_files(folderPath)` command (generic recursive `.cs` lister,
     `src-tauri/src/commands.rs`, registered in `lib.rs`), files read via the existing
     `read_script` command, embedded inline.
  3. Other `.cs` files from the robot's linked repo (desktop, disk scan) — embedded inline.
  4. The user's saved script-library entries — NOT pasted inline; linked as
     `- name — {origin}/api/scripts/{id}/raw` so the target AI can fetch them if it
     supports URLs. Keeps the prompt short.
- No video-link feature (explicitly removed per user request — this panel no longer
  has any video input).
- Result is saved to `robot.aiPrompt` via `api.updateRobot(id, {aiPrompt})` on every
  build, and cleared the same way — so it persists server-side (SQLite JSON blob),
  surviving reloads and browser cache clears, not just localStorage.
- Known gap: removing the old generation flow also removed the only in-app UI for
  configuring an AI provider/API key. `ai/client.ts`'s provider settings (openrouter/
  gemini/anthropic/ollama) still exist and are still used by `analyzeScript()` for
  ScriptsPage's "AI describe" auto-summary, but there is currently no UI anywhere in
  the app to set a key for a fresh install — only devices with a key already saved
  in localStorage from before this change can use "AI describe".

### AI client (`ai/client.ts`) — now only backs ScriptsPage "AI describe"
- Providers (localStorage): openrouter (FREE), gemini, anthropic, ollama.
- OpenRouter = the free hosted option: free ":free" models, one free key from
  openrouter.ai/keys, OpenAI-compatible POST to openrouter.ai/api/v1/chat/completions
  (Bearer key, x-title header; browser CORS OK). Free model IDs ROTATE often, so
  the panel calls fetchFreeOpenRouterModels() (public /api/v1/models, filters
  ":free", biggest-context first) to populate the dropdown live; OPENROUTER_MODELS
  is only the offline fallback and self-corrects a stale saved model.
- `analyzeScript(name, content)`: bullet-point description of a .cs script, used by
  ScriptsPage auto-describe on add + per-row re-run. Only script-evident behavior.
- Anthropic: direct browser calls with `anthropic-dangerous-direct-browser-access`.
- `ai/reference.ts` MOSIM_SYSTEM_PROMPT is distilled from ALL 8 public Reefscape
  mods (MoSim-Reefscape-Public/Assets/Prefabs/Reefscape/Robots/Mods): real APIs for
  input actions, base-class state, game-piece controllers, rollers/animation wheels,
  audio (incl. one-shot clack + PlayOneShot), setpoint SOs / SingleEditableFloat /
  inline structs / enums, auto-align, lights, sub-component MonoBehaviours. Requires
  rollers + UpdateAudio() + state machine; de-emphasizes joint movement (handled
  elsewhere) and setpoint numbers (units differ → // TODO placeholders). It's a
  template literal — code fences are \`\`\`csharp (escaped), closing is a real backtick.
  Now consumed both by `analyzeScript()` and embedded directly into built prompts
  by `promptBuilder.ts`.

### TBA API
- ONE server-side key: `TBA_AUTH_KEY` env on the droplet (never in git). Users
  no longer enter a key; the localStorage `mosim_tba_key` flow and RobotForm
  key UI were removed.
- Server: GET /api/tba/team/:number (requireAuth, digits only) proxies
  thebluealliance.com/api/v3/team/frc{number} with `X-TBA-Auth-Key`, returns
  {nickname, name}, 24h in-memory cache. 404 when the env key is missing.
- Frontend `lib/tba.ts` fetchTeamName() calls the proxy (relative URL on web;
  desktop uses getServerUrl() + Bearer token from localStorage `mosim_token`).

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
  DB_PATH, optional ADMIN_EMAILS, optional GITHUB_CLIENT_ID/SECRET +
  DISCORD_CLIENT_ID/SECRET (each pair enables that sign-in provider), optional
  TBA_AUTH_KEY (enables the server-side TBA team-name proxy), optional
  PUBLIC_ORIGIN (absolute origin for social-embed URLs; default mods.sebastianw.tech).
- Droplet npm blocks install scripts (allowScripts): manage.sh approves
  better-sqlite3 + esbuild each deploy and verifies require('better-sqlite3').
- Rate limiting: in-process per-IP limiter in api.js (600/min all /api; 40/5min
  on auth login + OAuth callbacks). Requires `app.set('trust proxy', 1)` (server.js)
  so req.ip is the real client behind nginx. express.json capped at 600kb.
- Hot public reads (/community, /steps, /themes) TTL-cached in-process (15-30s,
  bounded staleness — no write invalidation since they change slowly).

### Social embeds (Open Graph)
- Crawlers don't run JS, so previews are server-rendered. web/index.html carries
  site-wide OG/Twitter defaults (survive the Vite build). server.js renderIndex()
  overrides them per page; escapeHtml() guards injected user values (XSS-safe).
- `GET /u/:uid` (REAL path, not the hash route) serves a per-user embed using ONLY
  public data — the public robot COUNT, never robot details — then redirects
  humans to `/#/u/:uid`. Hidden users / 0-public-mod users fall back to the
  generic embed, so private robots never leak. UserProfilePage has a Share button
  that copies the clean `/u/:uid` URL. og:image falls back to /favicon.png.
- `GET /robot/:id` (REAL path) serves a per-robot embed for PUBLIC robots only
  (`!private && !modpackPrivate`); private/unknown fall back to the generic embed.
  Description = "Team N · game · status · P% complete (a/b sub-steps · c/d steps)".
  server.js robotProgress() derives progress + STATUS from the live steps template
  (currentSteps(): admin `settings.steps` override else bundled steps.json) and the
  robot's saved checkmarks — status is derived (Complete/In progress/Planned), NOT
  the stored status field, so the preview auto-updates as steps get checked. Humans
  are redirected to `/#/robot/:id`. NOTE: that hash route is behind RequireAuth, so
  a signed-out click-through hits the sign-in wall (the embed card itself is public).

---

### Modpacks (year-scoped)
- A modpack's `game` field IS its year/season (e.g. "2025: Reefscape"); modpacks
  are now editable in place (`ModpacksPage.tsx`: Edit button per row swaps the row
  into the same add-form fields — name/game/description — Save calls the existing
  `api.updateModpack`). If the game is changed on a pack that still has member
  robots, a confirm dialog warns and, on confirm, those robots are detached
  (`api.setRobotModpack(id, null)`) since a robot can only belong to a modpack from
  its own year.
- Attachment is enforced client-side wherever a robot picks a modpack: `RobotForm.tsx`
  filters the modpack dropdown to `modpacks.filter(m => m.game === game)` and clears
  an incompatible selection when the game field changes (`changeGame`); the "+ New"
  inline modpack form defaults its game to the robot's currently selected game.
  `RobotDetailPage.tsx` filters its Modpack `Select` the same way, and blurring an
  edited Game text field auto-detaches an existing modpack whose `game` no longer
  matches. No server-side check was added (matches the existing pattern where e.g.
  team-number format also isn't server-validated; this is a single-owner-per-uid app).

## Pending / Known Issues

- Server data migration note: none needed for settings table (CREATE IF NOT EXISTS).
- After changing steps via admin, other open clients pick it up on next reload only.
- macOS/Linux installer builds are untested by the user (no hardware).
- RobotFramework API review (2026-07-20): all 28 C# scripts in the external
  `MoSim-Reefscape-Public/Assets/Scripts/RobotFramework` source were reviewed.
  Script generation must use the real framework: `RobotBase` input actions,
  `DriveController`/`AutoAlign`, `GenericJoint`/`GenericElevator`/`GenericRoller`,
  and `RobotGamePieceController` named nodes and states. Avoid inventing custom
  movement, physics, or game-piece APIs when a framework API exists.
- The verified API contract is embedded in `web/src/ai/reference.ts` under
  “Verified RobotFramework API contract.” It captures the exact drive override
  spelling, joint fluent calls and units, roller one-tick override behavior, and
  game-piece intake/node/release methods. Keep it aligned with the framework source.

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

---

## Session Notes

- 2026-07-20: Reviewed current context files (`CLAUDE.md`, `AI_CONTEXT.txt`,
  `AI_ACTIVITY_LOG.md`) and sampled Claude-history files from
  `C:\Users\Seb\.claude\projects\C--Users-Seb-Desktop-Merch-MerchSite`:
  `memory/mosim-mod-tracker-project.md`, `memory/mosim-ai-context-files.md`,
  and JSONL snippets from sessions `8ed9b53f`, `01310bed`, `09f3c293`,
  `74c44d46`.
- Confirmed that external Claude directory is a mixed store (MoSim + unrelated
  sessions). Current repository code and this synced context file remain the
  authoritative source.
- 2026-07-20: Improved admin custom-theme auto generation in `web/src/lib/color.ts` so mismatched primary/secondary inputs are auto-harmonized toward complementary pairings with safer saturation/lightness ranges; updated admin copy in `web/src/pages/AdminPage.tsx` to reflect this behavior.
- 2026-07-20: Adjusted custom theme generation to keep user-entered primary/secondary as the two base inputs while auto-deriving fitting third/fourth accents (`gold`,`red`) from the pair; increased primary presence by making `.btn.primary` use `var(--accent)` (removed hardcoded green/cloud overrides), strengthening `accent-dim`, and tinting titlebar more toward primary.
- 2026-07-20: Committed and pushed the theme-generator follow-up: primary/secondary stay user-driven, third/fourth accents auto-derived from the pair, and primary visibility increased by switching `.btn.primary` to `var(--accent)` and strengthening accent-driven styling.
- 2026-07-20: User preference set to push to `main`; pushed current HEAD to `origin/main` via `git push origin HEAD:main` (main advanced to `2d813e5`).
- 2026-07-20: Fixed theme primary/secondary fidelity: custom theme `accent` and `blue` now use the exact user-entered primary/secondary values (no remap), while derived accents remain generated. Secondary influence was increased in neutral/border/titlebar derivation, and `accent-contrast` is generated so primary buttons stay readable across light/dark primary colors.
- 2026-07-20: User preference updated: commit and push by default after completed code changes; continue pushing to `main`.
- 2026-07-20: Split theme palette from color mode: `data-theme` (default/cloud/custom)
  + `data-color-mode` (dark/light) with separate titlebar controls; custom themes
  inject both modes; dropdown menus stay open while scrolling inside them.
- 2026-07-21: Added GitHub + Discord sign-in and account connecting (user
  dropped Steam and a free AI provider from the original request). Server:
  provider-parameterized OAuth in api.js (authUrlFor, finishAuth, providerOf,
  /api/auth/providers, /api/auth/callback/github|discord, prefixed subjects
  github:/discord:). Frontend: AuthProvider types, authProviders()/signIn(p)/
  startLinkAccount(p) in Backend + HTTPBackend, useAuthProviders hook,
  provider buttons in SignInGate/AuthButton, Connect buttons + provider tags on
  AccountPage. DEPLOY.md documents the optional env creds (already set on the
  droplet per user). No DB migration needed.
- 2026-07-21: Moved TBA to one server-side key: new authed proxy
  GET /api/tba/team/:number (TBA_AUTH_KEY env, 24h cache), lib/tba.ts now calls
  it, RobotForm per-user key UI removed. Key value lives only in droplet .env.
- 2026-07-22: UI refinement pass (impeccable /polish, "refine what's there"
  direction). CSS + one asset only, no JSX/behavior changes. Bundled a
  self-hosted UI typeface (IBM Plex Sans variable, web/public/fonts/
  plex-sans-var.woff2, ~45KB latin) replacing the raw Segoe UI system font;
  added antialiasing + slight negative tracking on body and display headings.
  Gave the default (dark and light) theme subtle accent-tinted atmospheric
  background gradients (was --bg-image: none) and a tight contact --shadow on
  dark (was none). Added tabular-nums to team numbers and progress readouts,
  a themed ::selection color, a unified :focus-visible keyboard ring, and an
  accent-tinted active nav state (previously identical to hover). Added
  explicit font-src 'self' tauri: asset: data: to the desktop CSP in
  tauri.conf.json. Verified: web build (tsc+vite) passes, font copies to
  dist/fonts and is referenced in built CSS, no console errors, design
  detector clears (remaining gradient-text hit is the pre-existing Instagram
  brand label). Note: browser screenshots time out in this environment;
  verification was via computed styles / accessibility tree, not visual.
- 2026-07-24: Added a "Copy colors as JSON" action to the ThemeButton right-click
  menu (App.tsx) backed by `exportThemeColors()` in theme.tsx — reads the live
  rendered palette (27 color vars) from computed styles and copies `{theme, mode,
  colors}` to the clipboard. Works for built-in + custom themes and the active
  brightness. Added a `.dd-sep` dropdown divider. Build + live dropdown verified.
  Also shipped THEME_COLORS.md (portable palette spec for reuse elsewhere).
- 2026-07-24: Added the reverse — "Import colors from JSON" in the same menu:
  paste an exported object or bare color map to apply it as a local (per-device,
  localStorage) theme, selectable + deletable in the theme list. parseThemeImport/
  injectImportedThemes/importTheme/removeImportedTheme in theme.tsx; paste modal +
  delete affordance in App.tsx; verified injection specificity + gradient-kill.
- 2026-07-23: Polish pass across every page (impeccable /polish). CSS + JSX
  (inline-style consolidation), no behavior/copy changes. Shared CSS lifts that
  touch all pages: `.page-head p` constrained to 64ch measure + 1.5 line-height;
  `.empty`/`.loading` gained horizontal padding (44px 24px, was 40px 0) + a
  faint panel wash on `.empty`. Consolidated repeated inline `style={{}}` layout
  into named classes: new `.page-actions` (back/share row) and `.btn-row`;
  `.account-card + .account-card`, `.account-subhead + p`, `.account-identity >
  .btn`, `.linked-list + .btn-row`, `.profile-header` margin, and `.signin-card`
  brand/mark/lead/stacked-button rules + `.profile-setup-card` centering. Updated
  JSX in App.tsx (SignInGate, ProfileSetup), AccountPage, UserProfilePage,
  HomePage (loading → `.loading`), RobotForm (status spans → `muted small`).
  Remaining inline styles are all legitimately dynamic (portal positioning,
  ProgressBar transform, AdminPage live theme-preview colors). Verified: web
  build (tsc+vite) passes, detector clean except the known Instagram label.
  Browser pane viewport was stuck at 0x0 this session, so layout was verified
  via computed styles/DOM, not pixels.
- 2026-07-24: Robot share embed. New server route GET /robot/:id renders a
  per-robot Open Graph card for PUBLIC robots only (mirrors /u/:uid), with progress
  + STATUS derived live from the steps template (server.js currentSteps()/
  robotProgress()), so the preview auto-updates. Human click-through /#/robot/:id
  is still behind RequireAuth (flagged; embed card itself is public). node --check
  + progress math verified; server not run locally (native deps absent).
- 2026-07-24: Repos overhaul. (1) Removed localPath from the shared Repo record;
  it's now per-device in localStorage via lib/repoPaths.ts (getRepoPath/setRepoPath),
  with a desktop-only folder control on each repo card. Updated the other readers
  (AiScriptPanel disk reads, RobotDetailPage open-folder). (2) scan_repo ignores
  robot folders named 9496/ClimbExamples/118/2910 (IGNORE_ROBOTS in commands.rs) +
  never descends into ClimbExamples (added to SKIP). (3) After a scan, ReposPage
  autolinks each detected folder to a tracked robot matched by team number when the
  match is unambiguous and the robot is currently unlinked (never overwrites).
  Web build passes; Rust reviewed by hand (no toolchain locally).
- 2026-07-26: Theme export = 2 seed colors. exportThemeColors now returns a
  one-element array `[{name, primary, secondary}]` (name = theme label; seeds =
  stored custom seeds, else live accent/blue) — signature gained an allThemes arg for
  the name. parseThemeImport returns ParsedTheme[] and accepts that array, a single
  seed-pair object, or a bare/legacy CSS-var map; importTheme returns ImportedTheme[]
  (imports all, picker selects the first). theme.tsx + SettingsPage.tsx + App.tsx.
- 2026-07-26: New ADMIN-ONLY /settings page (web/src/pages/SettingsPage.tsx),
  absorbing /admin. Tabbed (.tab-bar): Themes / Workflow steps / Users; /settings
  redirects to /settings/themes; /admin redirects to /settings; a "Settings" nav
  link shows only for admins. Themes tab = ThemePicker (active-theme grid +
  color-mode toggle + Copy-colors export + inline Import + imported-theme delete)
  then ThemesEditor (custom themes). Steps tab = StepsEditor, Users tab =
  UsersEditor (all moved verbatim from the deleted AdminPage.tsx). The titlebar
  ThemeButton right-click menu is now selection-only (export/import/delete removed).
  Added .settings-theme-grid/.settings-theme-chip/.settings-theme-pick/.settings-import
  CSS. Verified: web build (tsc+vite) passes, no console errors on load, theme menu
  renders selection-only (2 built-ins, no export/import), Settings nav hidden when
  signed out, /settings routes without crashing.
- 2026-08-02: AI Prompt Builder replaces the old AI script generator on the robot
  detail page. `AiScriptPanel.tsx` no longer calls any AI provider — it assembles one
  copy-pasteable prompt (`ai/promptBuilder.ts` `buildRobotPrompt()`) from a manual
  description, the team's real GitHub repo (reference-only, embedded), a local
  RobotFramework checkout (desktop-only, per-device path via new `lib/frameworkPath.ts`,
  scanned with a new generic Tauri command `list_cs_files` in `commands.rs`/`lib.rs`,
  reference-only, embedded), and the user's saved script-library entries (linked via a
  new public route `GET /api/scripts/:id/raw`, not pasted inline — same unguessable-UUID
  trust model as `/robot/:id`/`/u/:uid`; backed by new `db.js` `getById()`). The video-link
  feature was removed entirely per explicit request. The built prompt is saved to a new
  `Robot.aiPrompt` field via the existing `updateRobot` CRUD path, so it persists
  server-side (SQLite JSON blob) across reloads and browser cache clears, not just
  localStorage. `ai/client.ts` was trimmed of the old generation code path (video/Gemini
  fileData, buildPrompt, generateScript) but keeps its provider settings + `analyzeScript()`,
  which ScriptsPage's "AI describe" still depends on — flagged gap: there is now no UI
  anywhere in the app to configure an AI provider/key for a fresh install (previously
  AiScriptPanel was the only place with that UI). Also this session: retired the separate
  `AI_CONTEXT.txt` mirror file — `CLAUDE.md` is now the single authoritative AI context
  file (see the Approach section at the top for the updated doc-maintenance rule).
  **Verified:** `npm run build` (tsc+vite) in `web/` passed; `node --check` passed for
  `server/api.js` and `server/db.js`. Rust changes (`commands.rs`, `lib.rs`) were reviewed
  by hand only — no local Rust/Tauri toolchain to compile against. No runtime/browser
  smoke test was performed (framework-folder scan and repo-disk-read paths are
  desktop/Tauri-only and can't be exercised from the web preview; the web-facing parts
  — description/source-repo/script-library-link flow, persisted-prompt reload — were not
  smoke-tested live either this session).
  **Files changed:** `server/db.js`, `server/api.js`, `web/src/types.ts`,
  `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`, `web/src/lib/desktop.ts`,
  `web/src/desktop.d.ts`, `web/src/lib/frameworkPath.ts` (new), `web/src/ai/client.ts`,
  `web/src/ai/promptBuilder.ts` (new), `web/src/components/AiScriptPanel.tsx` (rewritten),
  `CLAUDE.md`, `AI_ACTIVITY_LOG.md`. `AI_CONTEXT.txt` deleted.
- 2026-08-02: Modpacks are now editable (name/game/description) via an inline
  edit form in `ModpacksPage.tsx`, reusing the existing `api.updateModpack`.
  Changing a modpack's game while it still has member robots now warns and
  detaches them (a robot can only belong to a modpack from its own year).
  Enforced the year restriction wherever a robot's modpack is picked:
  `RobotForm.tsx` and `RobotDetailPage.tsx` both filter the modpack dropdown to
  packs matching the robot's `game`, and clear/detach an incompatible modpack
  when the game changes. **Verified:** `npm run build` (tsc+vite) in `web/`
  passed; loaded the dev server in the browser preview pane with no console
  errors (full interactive flow needs Google sign-in, not exercised locally).
  **Files changed:** `web/src/pages/ModpacksPage.tsx`,
  `web/src/components/RobotForm.tsx`, `web/src/pages/RobotDetailPage.tsx`,
  `CLAUDE.md`, `AI_ACTIVITY_LOG.md`.
