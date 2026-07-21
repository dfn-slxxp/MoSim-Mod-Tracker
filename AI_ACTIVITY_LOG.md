# AI Activity Log

This is the project-local, append-only continuity log for work performed by AI
assistants. It lets another assistant resume the work without relying on a specific
chat provider or access to its private conversation storage.

## Logging rules

- After every user message, append an entry with the exact request, the visible work
  performed, important decisions, verification, files changed, and the user-facing
  outcome.
- Log private reasoning only as a concise, decision-focused rationale. Do not attempt
  to export hidden chain-of-thought or secrets.
- Keep `CLAUDE.md` and `AI_CONTEXT.txt` synchronized whenever this log's process or
  project state materially changes.
- Never include access tokens, API keys, cookie values, or other credentials.

## 2026-07-20 — Current Codex session

### Project orientation

**User message:** "Read through AI_CONTEXT.txt/CLAUDE.md to understand the project.
it is in a github repo so you can use that. if you can access my previous claude chats
in my claude code chat in this folder read thorugh those too"

**Work and decisions:** Read both handoff files, confirmed they were byte-identical,
inspected the local `.claude` folder, and reviewed repository history/remotes. The
workspace's `.claude` directory contained only a launch configuration, not saved chat
history.

**Outcome:** Project architecture and current repository state were understood; no
files were changed.

### RobotFramework API review

**User message:** "read through all the scripts in
C:\Users\Seb\Desktop\MoSim-Reefscape-Public\Assets\Scripts\RobotFramework to
understand all the apis for the script generation"

**Work and decisions:** Inventoried 28 C# files (about 205 KB), reviewed the public
API surface of every file, and closely reviewed the core implementations for
`RobotBase`, drivetrain and auto-align, generic joint/elevator/roller components,
and the game-piece intake/controller/node system. The intent was to use verified
framework calls in generated C# rather than infer APIs.

**Outcome:** This knowledge was later embedded into the generator prompt.

### Shared handoff requirement

**User message:** "keep updating claude.md and ai_context.txt after every message so
the ai i use to work on this doesnt matter"

**Work and decisions:** Added a shared-context rule to both handoff files and recorded
the RobotFramework review. Confirmed the files remained byte-identical.

**Commit/push:** `f03d561 docs: record RobotFramework API review` was committed and
pushed to `main` at the user's request.

### Script-generator API contract

**User message:** "you only pushed the .md and .txt files, not the cs file
information for the script generator"

**Work and decisions:** Updated `web/src/ai/reference.ts` with a verified
RobotFramework API contract: `RobotBase` inputs, the deliberately spelled
`DriveController.overideInput`, joint units and fluent PID calls, elevator and roller
semantics, and game-piece intake/state/release APIs. Escaped inline backticks after
the TypeScript build caught them inside the template literal. Ran the web production
build successfully.

**Commit/push:** `dddd31c feat: ground script generation in RobotFramework APIs` was
committed and pushed to `main`.

### Local Claude-history review

**User message:** "C:\Users\Seb\.claude\projects\C--Users-Seb-Desktop-Merch-MerchSite
This has the claude project files, it might also include files regarding a separate
claude project"

**Work and decisions:** Inspected the folder and its memory files. It contains MoSim
Mod Tracker history (initial build, Tauri migration, deployment, and later features)
as well as unrelated MerchSite and standalone GenericTurret work. The enclosing folder
name is not a trustworthy project identifier. Added this source and the rule that
current code/context supersede historical Firebase/Electron-era details to both
handoff files.

**Current uncommitted changes before this entry:** `CLAUDE.md` and `AI_CONTEXT.txt`
contain the local-history note and are synchronized.

### Durable activity-log request

**User message:** "keep files in the project file where you store every message i
send and every thought process you have and every response so i can input that back
into claude later and have claude understand everything that happened"

**Work and decisions:** Created this append-only log. It will retain exact user
requests, user-visible work, concise decision rationales, verification, changed files,
and assistant outcomes. Private hidden reasoning and secrets are deliberately excluded;
the log records the useful decision rationale instead.

**Current uncommitted changes after this entry:** `AI_ACTIVITY_LOG.md`, `CLAUDE.md`,
and `AI_CONTEXT.txt`.

### Release commit and workflow tag

**User message:** “commit it and tag the commit v1.5.3 to trigger workflow on gh”

**Work and decisions:** Commit the activity-log and synchronized handoff updates,
apply the `v1.5.3` tag to that commit, then push `main` and the tag to `origin`.
The release workflow is configured to run when a `v*.*.*` tag is pushed.

### Default robots ordering

**User message:** “by default the sorting of the robots in the robots tab should be
by year first (recent on top), and within that by team number (website + app view)”

**Work and decisions:** Both views use `web/src/pages/RobotsPage.tsx`. Change the
default selected sort to Year descending and use ascending numeric team order (with
the existing suffix-aware tie-break) within each year. Keep the user-selectable sort
controls available for other views.

**Verification:** `npm.cmd --prefix web run build` passed (TypeScript and Vite).
The current uncommitted change set is `web/src/pages/RobotsPage.tsx` plus this log and
the synchronized handoff files.

### Commit and push default ordering

**User message:** “commit and push”

**Work and decisions:** Commit the verified default robots ordering and its portable
handoff/activity-log updates to `main`, then push it to `origin`.

### Theme auto-generation harmony fix

**User message:** "Make it so the theme color auto generation in the admin page actually generate complimentary colors that fit and not colors that just dont fit. update aicontext and stuff"

**Work and decisions:** Reworked `web/src/lib/color.ts` theme generation to harmonize color pairs before palette derivation. The generator now clamps primary/secondary saturation/lightness to usable ranges, shifts secondary hue toward a complementary or split-complementary offset when needed, and tints neutrals from a mixed accent hue so panels/borders/text stay cohesive. Updated admin copy in `web/src/pages/AdminPage.tsx` to state that secondary input is auto-harmonized.

**Verification:** Installed missing web dependencies after `tsc` was unavailable, then ran `npm --prefix web run build` successfully.

**Files changed:** `web/src/lib/color.ts`, `web/src/pages/AdminPage.tsx`, `AI_ACTIVITY_LOG.md`, `CLAUDE.md`, `AI_CONTEXT.txt`.

**User-facing outcome:** Admin custom theme generation now automatically steers mismatched color pairs into complementary combinations that produce more coherent palettes.

### Context-file and Claude-history review

**User message:** "Read through the context files claude, ai_context, etc. C:\Users\Seb\.claude\projects\C--Users-Seb-Desktop-Merch-MerchSite some files in here (not all), understand what the project is"

**Work and decisions:** Renamed this session and branch, read the repo context files (`CLAUDE.md`, `AI_CONTEXT.txt`, `AI_ACTIVITY_LOG.md`), listed and sampled the external Claude-history folder, and reviewed representative files: `memory/mosim-mod-tracker-project.md`, `memory/mosim-ai-context-files.md`, and JSONL snippets from sessions `8ed9b53f`, `01310bed`, `09f3c293`, and `74c44d46`.

**Verification:** Confirmed the external Claude directory is mixed content, with MoSim Mod Tracker sessions plus unrelated sessions; treated current repository code and synced handoff files as authoritative.

**Files changed:** `AI_ACTIVITY_LOG.md`, `CLAUDE.md`, `AI_CONTEXT.txt`.

**User-facing outcome:** Delivered a grounded project understanding from both current handoff files and selected historical Claude records.

### Theme generator follow-up (fixed input semantics)

**User message:** "no i want to input primary and secondary, i want the third and fourth color auto generated to fit. the primary color also isnt showing up much in the theme"

**Work and decisions:** Updated `web/src/lib/color.ts` so primary and secondary remain the direct user inputs (normalized for usable saturation/lightness), while third/fourth accents (`gold`, `red`) are auto-derived from the primary+secondary pair. Increased primary influence by tinting titlebar more toward primary and strengthening `accent-dim`. Updated `web/src/styles.css` so `.btn.primary` now uses `var(--accent)` instead of hardcoded green, and removed cloud-only hardcoded primary button overrides. Updated admin helper text in `web/src/pages/AdminPage.tsx` to describe the 3rd/4th auto-derived behavior.

**Verification:** `npm --prefix web run build` passed.

**Files changed:** `web/src/lib/color.ts`, `web/src/styles.css`, `web/src/pages/AdminPage.tsx`, `AI_ACTIVITY_LOG.md`, `CLAUDE.md`, `AI_CONTEXT.txt`.

**User-facing outcome:** Theme editing now preserves your chosen primary/secondary, generates fitting additional accents automatically, and makes primary visibly drive key UI elements.

### Commit and push (theme follow-up)

**User message:** "commit and push"

**Work and decisions:** Committed the current theme-generator follow-up set (primary/secondary input semantics, auto-derived third/fourth accents, stronger primary presence in UI styling) together with synchronized context/log file updates, then pushed the branch to origin.

**Verification:** Checked git status before commit and pushed without additional local modifications.

**Files changed:** `web/src/lib/color.ts`, `web/src/styles.css`, `web/src/pages/AdminPage.tsx`, `AI_ACTIVITY_LOG.md`, `CLAUDE.md`, `AI_CONTEXT.txt`.

**User-facing outcome:** Branch now contains and publishes the requested theme-generation fixes.

### Push destination preference

**User message:** "push to main always"

**Work and decisions:** Pushed current HEAD directly to `origin/main` (`git push origin HEAD:main`) and recorded the preference to push to `main` for future pushes.

**Verification:** Remote updated `main` from `7a3ec97` to `2d813e5`.

**Files changed:** `AI_ACTIVITY_LOG.md`, `CLAUDE.md`, `AI_CONTEXT.txt`.

**User-facing outcome:** Latest theme-generator commit is now on `main`.

### Primary/secondary fidelity fix

**User message:** "the main color looks off and the secondary color doesnt look like its being used much. make sure main and secondary are actually main and secondary"

**Work and decisions:** Updated `web/src/lib/color.ts` so `accent` and `blue` are now the literal user-entered primary/secondary values (no hue/lightness remapping), while derived colors continue to be generated from that pair. Increased secondary influence by making neutral hue/border/titlebar generation more secondary-led. Added `accent-contrast` generation from luminance for readable primary buttons. Updated `web/src/styles.css` to use `--accent-contrast` for `.btn.primary` text and to blend hover state with `--blue`, so both primary and secondary are visibly used.

**Verification:** `npm --prefix web run build` passed.

**Files changed:** `web/src/lib/color.ts`, `web/src/styles.css`, `AI_ACTIVITY_LOG.md`, `CLAUDE.md`, `AI_CONTEXT.txt`.

**User-facing outcome:** Primary and secondary now behave as true primary/secondary theme colors across the UI, with derived colors built around them.

### Commit-and-push default preference

**User message:** "commit and push always"

**Work and decisions:** Recorded a standing preference to commit and push after completed code changes, and to keep pushing to `main` per prior preference.

**Verification:** Applied as workflow preference for this session.

**Files changed:** `AI_ACTIVITY_LOG.md`, `CLAUDE.md`, `AI_CONTEXT.txt`.

**User-facing outcome:** Future completed fixes will be committed and pushed by default.

### Custom theme color presence (Cloud parity)

**User message:** Custom theme primary/secondary colors don't affect the overall page much; make them as impactful as built-in themes like Cloud.

**Work and decisions:** Reworked `generateTheme()` in `web/src/lib/color.ts` to match Cloud-theme intensity: layered `bg-image` radial/linear gradients from the color pair, much higher surface/border/muted/titlebar saturation, colored light-mode shadows, larger light-mode radius, and smarter tint weighting so light off-white primaries (e.g. `#F8F7F4`) defer surface hue to the vivid secondary instead of skewing toward accidental warm casts. `accent-dim` now uses secondary when primary reads neutral so chips/washes stay visible. Updated admin helper copy in `web/src/pages/AdminPage.tsx`.

**Verification:** Generated palette for `#F8F7F4` + `#0057FF` light now yields blue-tinted bg/border/muted/titlebar comparable to Cloud's purple palette structure.

**Files changed:** `web/src/lib/color.ts`, `web/src/pages/AdminPage.tsx`, `CLAUDE.md`, `ai_context.txt`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** Custom themes now tint the full page (background gradients, panels, borders, muted text, titlebar) as strongly as the built-in Cloud theme. Re-save themes in admin to regenerate stored vars, or change a color and save.

### Theme vs color mode + scrollable dropdowns

**User message:** Make dark and light mode independent of the theme (separate theme selector and dark/light switch). Make custom dropdowns scrollable without JS closing them on scroll.

**Work and decisions:** Split `theme.tsx` into palette (`data-theme`: default, cloud, custom-*) and brightness (`data-color-mode`: dark/light) with separate localStorage keys; migrated legacy saves where dark/light were theme ids. Added `ColorModeButton` (🌙/☀️) beside `ThemeButton` in titlebar/topbar. Restructured `styles.css` selectors; added cloud dark variant. `injectCustomThemes()` now emits CSS for both color modes per custom theme. Admin theme editor preview brightness toggles global color mode. Fixed `Select.tsx` and theme menu scroll handlers to ignore scroll events whose target is inside the open menu; added `overscroll-behavior: contain` on `.dd-menu`.

**Verification:** `npm run build` in `web/` succeeded (tsc + vite).

**Files changed:** `web/src/theme.tsx`, `web/src/App.tsx`, `web/src/components/Select.tsx`, `web/src/styles.css`, `web/src/pages/AdminPage.tsx`, `CLAUDE.md`, `ai_context.txt`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** Theme picker cycles Default/Cloud/custom palettes; moon/sun button toggles dark vs light independently. Long dropdown lists can be scrolled without the menu closing.

### GitHub + Discord sign-in and account connecting

**User message:** Add GitHub, Steam, and Discord login options plus the ability to connect them to accounts, and a free AI option in the script generator. Mid-task the user narrowed scope: no Steam login, no free AI provider. Confirmed the OAuth app credentials are already in the droplet .env; asked to implement, commit, and push.

**Work and decisions:** Generalized the hand-rolled Google OAuth in `server/api.js` to three providers with no new dependencies and no DB migration. New identity subjects are prefixed (`github:<id>`, `discord:<id>`); bare Google subs stay as-is, so `account_links`, `resolveUid`, and `mergeAccounts` work unchanged. Extracted the shared callback tail into `finishAuth()` (link-merge vs login+session, desktop deep link vs cookie). Added `GET /api/auth/providers` (public availability flags), `provider` param on `/api/auth/login` and `/api/auth/link-start`, and callbacks `/api/auth/callback/github` (scope `read:user user:email`, prefers primary verified email from /user/emails) and `/api/auth/callback/discord` (scope `identify email`, email only when verified, CDN avatar). Providers are enabled only when `GITHUB_/DISCORD_CLIENT_ID+SECRET` env pairs exist; redirect URIs derive from `OAUTH_REDIRECT_URI` + `/github|/discord`. Decision: never auto-merge accounts by matching email (account-takeover risk); linking stays explicit. Frontend: `AuthProvider` types, `authProviders()`/`signIn(provider)`/`startLinkAccount(provider)` on the Backend interface and HTTPBackend, `useAuthProviders()` hook (defaults Google-only, refetches when store is ready for the desktop server URL), provider buttons on the SignInGate and topbar AuthButton, and Connect Google/GitHub/Discord buttons plus provider tags on the Account page. `DEPLOY.md` gained an optional-providers section.

**Verification:** `node --check server/api.js` passed; `npm run build` in `web/` (tsc + vite) passed.

**Files changed:** `server/api.js`, `server/DEPLOY.md`, `web/src/types.ts`, `web/src/store/backend.ts`, `web/src/store/http.ts`, `web/src/lib/useAuthProviders.ts` (new), `web/src/components/AuthButton.tsx`, `web/src/App.tsx`, `web/src/pages/AccountPage.tsx`, `CLAUDE.md`, `AI_CONTEXT.txt`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** The sign-in page and topbar offer Google, GitHub, and Discord (GitHub/Discord appear only when the server has their credentials). The Account page can connect any of the three providers as additional sign-ins; linked rows show which provider each account is. Deploy on the droplet to go live; the .env creds are already in place.

### Server-side TBA key

**User message:** Use one TBA API key server-side so users don't have to enter it (key provided in chat).

**Work and decisions:** Added an authenticated proxy `GET /api/tba/team/:number` in `server/api.js` that calls The Blue Alliance with a `TBA_AUTH_KEY` env var and returns `{nickname, name}` with a 24h in-memory cache (digits-only validation; requireAuth so it is not an open proxy; 404 when the env var is unset). Rewrote `web/src/lib/tba.ts` to call the proxy (relative URL on web with the session cookie; desktop uses `getServerUrl()` plus the Bearer token from localStorage). Removed the per-user key UI and localStorage key flow from `RobotForm.tsx` (`getTbaKey`/`setTbaKey`/`mosim_tba_key` are gone). Decision: per project rules the key value is NOT committed to git and is not recorded in this log; it belongs in `server/.env` on the droplet.

**Verification:** `node --check server/api.js` passed; `npm run build` in `web/` (tsc + vite) passed; grep confirms no remaining references to the old key flow.

**Files changed:** `server/api.js`, `server/DEPLOY.md`, `web/src/lib/tba.ts`, `web/src/components/RobotForm.tsx`, `CLAUDE.md`, `AI_CONTEXT.txt`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** Team-name lookup in the add-robot form works for every signed-in user with no key entry; the "Set TBA API key" UI is gone. Requires `TBA_AUTH_KEY` in the droplet `.env` plus a deploy.
