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

### UI refinement pass (typeface + depth polish)

**User message:** Read through CLAUDE.md and the AI context to understand the project, then revise the UI to be better.

**Work and decisions:** Ran the impeccable skill. Confirmed direction with the user: "refine what's there" (preserve the existing GitHub-ish dev-tool identity, elevate craft) and "yes, bundle a self-hosted font." Scope kept to CSS + one font asset + one CSP line; no JSX, copy, or behavior changes. Bundled a self-hosted variable UI typeface at web/public/fonts/plex-sans-var.woff2 (~45KB latin subset) via @font-face, replacing the raw Segoe UI system stack (Segoe UI kept as fallback). Initially chose Inter; the design detector flagged it as an overused/non-distinctive face, so switched to IBM Plex Sans for genuine engineering character that fits a robotics build tracker and rhymes with the code monospace. Added -webkit-font-smoothing antialiased + slight negative letter-spacing on body and display headings (h1 -0.02em, h2 -0.015em, h3 -0.01em). Depth/atmosphere: the default theme (both dark and light) went from --bg-image: none to a restrained accent-tinted two-radial gradient; dark --shadow went from none to a tight 0 1px 3px contact shadow (kept small to avoid the ghost-card border+halo antipattern). Micro-craft: tabular-nums on team numbers (.col-team, .team-num) and progress (.cell-progress); a themed ::selection using the live --accent; a unified :focus-visible keyboard ring across buttons/links/pills/nav; and an accent-dim + inset-ring active nav state (was visually identical to hover). Added explicit font-src 'self' tauri: asset: data: to the desktop CSP in src-tauri/tauri.conf.json (previously fell back to default-src). Decision: left the pre-existing .brand-ig Instagram gradient-text label untouched (real-brand signifier, out of scope).

**Verification:** npm --prefix web run build (tsc + vite) passed; font copied to web/dist/fonts/plex-sans-var.woff2 and referenced in the built CSS. Live checks against the dev server via computed styles / accessibility tree: IBM Plex Sans loaded and applied to body + headings, atmospheric --bg-image and contact --shadow present, active nav shows accent-dim + inset ring; no console errors. Design detector re-run: only the pre-existing Instagram brand-label gradient-text remains. tauri.conf.json re-validated as JSON. Note: browser screenshots time out in this environment, so verification was structural, not visual pixels.

**Files changed:** web/src/styles.css, web/public/fonts/plex-sans-var.woff2 (new), src-tauri/tauri.conf.json, CLAUDE.md, AI_CONTEXT.txt, AI_ACTIVITY_LOG.md.

**User-facing outcome:** The app now renders in a bundled IBM Plex Sans instead of the default system font (works offline and in the desktop build), with crisper heading typography. The default theme has subtle depth (atmospheric background tint, grounded panels) instead of a dead-flat look, team numbers and progress figures align as tabular readouts, text selection and keyboard focus are themed, and the current nav page is clearly marked. No layout, content, or behavior changed. Identity (GitHub-ish palette, three themes, motion system) preserved.

### Polish pass across every page

**User message:** Polish every page on the site.

**Work and decisions:** Ran impeccable /polish. Read every page (Home, Robots, RobotDetail, Modpacks, Repos, Scripts, Planned, Account, UserProfile, plus SignInGate/ProfileSetup in App.tsx) to find page-specific defects rather than only re-touching shared CSS. The app was already well-built (consistent empty/disabled/loading states, shared class system), so the polish concentrated on two things. (1) Shared CSS craft lifts that improve every page: `.page-head p` now constrained to a 64ch measure with 1.5 line-height (multi-line intros on the wide pages no longer stretch edge to edge); `.empty` and `.loading` gained horizontal padding (44px 24px, was 40px 0) plus line-height, and `.empty` a faint panel wash so it reads as an intentional surface, not a bare dashed outline. (2) Consolidated repeated inline `style={{}}` layout drift into named classes for consistency and correct spacing tokens: new `.page-actions` (back/share action row) and `.btn-row`; plus adjacency/rhythm rules `.account-card + .account-card`, `.account-subhead + p`, `.account-identity > .btn`, `.linked-list + .btn-row`, `.profile-header` margin, and a `.signin-card` block (centered brand, 48px mark, `.signin-lead`, full-width stacked provider buttons) and `.profile-setup-card` centering. JSX updated in App.tsx (SignInGate + ProfileSetup), AccountPage, UserProfilePage, HomePage (loading div -> `.loading`), and RobotForm (TBA status spans -> `muted small`). Decision: left the remaining inline styles alone because they are legitimately dynamic (Select/theme-menu portal positioning, ProgressBar scaleX transform, AdminPage live theme-preview colors from state). Reverted an over-reach: initially added `display:flex` to `.signin-card .btn`, then removed it since the original inline `justifyContent` was inert on a normal button, keeping the change faithful to prior behavior.

**Verification:** npm --prefix web run build (tsc + vite) passed after each change. Design detector re-run over the changed files: only the pre-existing Instagram brand-label gradient-text remains (accepted, real-brand signifier). Confirmed via the dev server that the `.loading` class and the signin-card CSS properties (brand centering, 48px mark, lead margin/align, button width rule) resolve to the intended values. Constraint: the in-app browser pane reported window.innerWidth/innerHeight of 0 the entire session (also why screenshots time out), so pixel-level layout could not be visually confirmed; each change is a faithful CSS equivalent of the inline style it replaced or a purely additive craft rule, verified by computed styles and DOM structure.

**Files changed:** web/src/styles.css, web/src/App.tsx, web/src/pages/HomePage.tsx, web/src/pages/AccountPage.tsx, web/src/pages/UserProfilePage.tsx, web/src/components/RobotForm.tsx, CLAUDE.md, AI_CONTEXT.txt, AI_ACTIVITY_LOG.md.

**User-facing outcome:** Every page reads a little more finished: intro copy sits at a comfortable measure instead of stretching across wide pages, empty and loading states have proper breathing room and a subtle surface, and the sign-in / first-run / account / public-profile surfaces are driven by consistent classes instead of ad-hoc inline styles. No layout, content, or behavior changed.
