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
- Keep `CLAUDE.md` up to date whenever this log's process or project state materially
  changes (it is the single authoritative AI context file; there is no separate
  `AI_CONTEXT.txt` mirror).
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

### Copy active theme colors as JSON

**User message:** Add a copy option for the colors that copies it as JSON (or similar) to use elsewhere.

**Work and decisions:** Added a "Copy colors as JSON" action to the theme dropdown (right-click the theme button in the titlebar/topbar; the same portal menu that lists the themes). Chose that menu because it is available to every user (not admin-only) and already tied to theme selection. New exported helper `exportThemeColors(theme, mode)` in web/src/theme.tsx reads the colors that are actually rendering from getComputedStyle(document.documentElement) for a curated list of 27 color CSS variables (bg, panel, panel-2, border-solid, text, muted, titlebar, accent, accent-contrast, accent-dim, blue, gold, red, and all pill-*-bg/fg pairs). Reading computed styles (rather than the generateTheme output) means it works identically for built-in and custom themes and captures the live dark/light brightness. Deliberately excluded bg-image (large gradient string), shadow, radius, radius-sm as non-color. Returns `{ theme, mode, colors }`; App.tsx serializes with JSON.stringify(..., 2) and writes it via navigator.clipboard.writeText (same call pattern as the existing share-link copy), with a 1.4s "Copied!" label flip and a try/catch no-op fallback if the clipboard is blocked. Added a `.dd-sep` divider style in styles.css (1px, --border-solid) to separate the copy action from the theme list.

**Verification:** npm run build (tsc + vite) in web/ passed. Live check against the dev server (viewport worked this session at 1280x720): right-clicked the theme button, confirmed the menu renders the new "Copy colors as JSON" option; clicked it and confirmed the label flips and resets; reproduced the exact export payload via computed styles and confirmed valid JSON with all 27 vars resolved for the active theme+mode (default/dark). No console errors. Clipboard read-back could not be asserted (browser denies clipboard READ permission), but the write path is the same one already used by the share button.

**Files changed:** web/src/theme.tsx, web/src/App.tsx, web/src/styles.css, CLAUDE.md, AI_CONTEXT.txt, AI_ACTIVITY_LOG.md.

**User-facing outcome:** Right-click the theme button and pick "Copy colors as JSON" to copy the current theme's full palette (whichever theme + dark/light mode is active) to the clipboard as a portable JSON object, ready to paste into another project or design tool.

### Portable theme-color spec doc

**User message:** Give me a markdown file explaining this so I can paste it into another website session and have it used there too.

**Work and decisions:** Wrote THEME_COLORS.md at the repo root — a self-contained, portable spec for reusing the palette in another site/AI session. Covers: the exported `{theme, mode, colors}` shape; a "how to apply" section mapping each token to a `--<token>` CSS custom property with usage examples and a dark/light `data-color-mode` switch; a token reference table (role of each of the 27 tokens, including the pill-*-bg/fg chip pairs); concrete reference JSON for the built-in "default" theme in BOTH dark and light; and notes (8-digit hex = alpha, pair accent-contrast with accent, gradient/shadow/radius excluded as non-color). Light values sourced from the `[data-color-mode='light']` block in styles.css; dark values from the live export verified in the prior step.

**Files changed:** THEME_COLORS.md (new), AI_ACTIVITY_LOG.md.

**User-facing outcome:** A single markdown file the user can paste into another session to have the same palette applied elsewhere.

### Import theme colors from JSON

**User message:** Make it so I can input these JSONs as well.

**Work and decisions:** Added an "Import colors from JSON" action to the theme dropdown (below the copy action), symmetric with the export. theme.tsx: new ImportedTheme type + parseThemeImport(text) that accepts either the exported {theme, mode, colors} shape or a bare {bg, accent, ...} map, drops unknown keys, rejects values containing {}<>; (CSS declaration break-out guard), and requires at least bg or accent. injectImportedThemes() writes a `<style id=mosim-imported-themes-style>` with `:root[data-theme='<id>'] {..}` blocks (mode-agnostic — a fixed pasted palette applies in both dark and light) and forces `--bg-image: none` unless the import carries one, so the default green/blue gradient doesn't bleed through (the base plain `:root` sets it). Imported themes persist in localStorage `mosim-imported-themes`, are injected on mount, appear in allThemes (cycle + menu) with a 📥 icon, and are deletable via a per-row ✕ (removeImportedTheme falls back to default if the active one is removed). The known-theme fallback effect now includes imported ids so an active import isn't reset. App.tsx: ThemeButton gained a paste modal (reuses .dialog-overlay/.dialog-card, monospace textarea, inline error) and delete affordance; styles.css got .dd-row/.dd-option-grow/.dd-del and .import-card/.import-textarea/.import-error.

**Verification:** npm run build (tsc + vite) passed. In the live dev server: confirmed the theme menu renders both "Copy colors as JSON" and "Import colors from JSON"; replicated injectImportedThemes + theme selection via computed styles and confirmed imported --accent/--bg/--text/--pill-* override the base, --bg-image resolves to none (body background-image none), and an untouched var (--gold) correctly falls back to the base default. No console errors.

**Files changed:** web/src/theme.tsx, web/src/App.tsx, web/src/styles.css, CLAUDE.md, AI_CONTEXT.txt, AI_ACTIVITY_LOG.md.

**User-facing outcome:** Right-click the theme button -> "Import colors from JSON", paste a palette (the exported object or a bare color map), and it applies as a new saved theme on that device, selectable and removable from the theme menu.

### Robot share embed (Discord/Open Graph)

**User message:** If I send a link of a mod progress tracker page (https://mods.sebastianw.tech/#/robot/<id>) in Discord it should show an overview of the robot like the in-app bar at the top. The status should pull from the steps and auto-update.

**Work and decisions:** Added a server-rendered per-robot Open Graph embed, mirroring the existing /u/:uid pattern (crawlers do not run JS, so the preview must be in the served HTML). server/server.js: imported getSetting from ./db; added bundledSteps() (cached read of steps.json), currentSteps() (admin steps override in the settings table wins, else bundled), and robotProgress(robot) which counts checked sub-steps and fully-completed steps from the live steps template + the robot's saved progress. Status is DERIVED from completion (percent >= 100 Complete, > 0 In progress, else Planned), not the stored status field, so a shared link always reflects where the build actually is and auto-updates as steps are checked. New route GET /robot/:id: only PUBLIC robots (!private && !modpackPrivate) get a real preview (title = robot name, description = "Team N . game . derived-status . P% complete (a/b sub-steps . c/d steps)", image = owner photo or /favicon.png); private/unknown robots fall back to the generic site embed so nothing leaks. Humans are JS-redirected to /#/robot/:id.

**Verification:** node --check server/server.js passed. Verified robotProgress math against the real steps.json (53 subs / 10 steps): 38 checked -> 72% / "In progress" / 7 full steps; empty -> 0% / "Planned". Confirmed getSetting returns a bare parsed array and admin PUT stores steps as a bare array, so currentSteps() picks the override correctly. Server deps are not installed locally (native better-sqlite3), so no live HTTP smoke test; route logic mirrors the proven /u/:uid embed.

**Known limitation (flagged to user):** the human click-through target /#/robot/:id is behind RequireAuth (unlike the public /u/:uid page), so a non-signed-in viewer hits the sign-in wall. The embed card itself renders for everyone. Making public robot detail pages viewable without sign-in would be a follow-up.

**Files changed:** server/server.js, CLAUDE.md, AI_CONTEXT.txt, AI_ACTIVITY_LOG.md.

**User-facing outcome:** Pasting a public robot link in Discord (or any OG crawler) shows a preview card with the robot name, team, game, live-derived status, and progress that updates as the build advances.

### Repos: device-local path, scan ignore list, autofill

**User messages:** Repos also should not have a local path (it is on the server and I am on my PC). The scan-repo function should ignore 9496 and ClimbExamples; also ignore 118 and 2910. It should also autofill the repo on the robots it detects if no conflicts arise.

**Work and decisions:**
1. Local path moved off the shared server record to a PER-DEVICE store. New web/src/lib/repoPaths.ts (localStorage key mosim-repo-paths, id -> path). Removed localPath from the Repo type (types.ts) so NewRepo no longer carries it; removed the local-path input from the add-repo form (ReposPage). The RepoCard now shows a desktop-only "folder on this PC" control (set / change, remembered per device); scan + open-folder use that path. Updated the two other readers of repo.localPath to use getRepoPath(repo.id): AiScriptPanel.tsx (reading .cs off disk) and RobotDetailPage.tsx (open-folder button). Added .repo-folder CSS.
2. Scan ignore list in src-tauri/src/commands.rs: new IGNORE_ROBOTS = 9496, ClimbExamples, 118, 2910 (skip detected robot folders with these names anywhere); also added ClimbExamples to SKIP so the scanner never descends into that example subtree.
3. Autofill on scan (ReposPage.scan -> autolink): after saving the scan, each detected folder is matched to a tracked robot by team number (folder name == team, or name). If exactly one match AND that robot has no repo yet, it is linked to this repo (api.updateRobot repoId). Never overwrites an existing link and never guesses on ties ("no conflicts" = unambiguous + currently unlinked). Shows a "Linked N robots" banner.

**Verification:** npm run build (tsc + vite) passed (fixed one TS narrowing error where the repo-scripts block guard changed from repo?.localPath to repoPath — added an explicit repo && guard). Rust change reviewed by hand (base.as_str() name match, continue skips list + descent); no Rust toolchain on this machine, so not compiled locally.

**Files changed:** web/src/types.ts, web/src/lib/repoPaths.ts (new), web/src/pages/ReposPage.tsx, web/src/components/AiScriptPanel.tsx, web/src/pages/RobotDetailPage.tsx, web/src/styles.css, src-tauri/src/commands.rs, CLAUDE.md, AI_CONTEXT.txt, AI_ACTIVITY_LOG.md.

**User-facing outcome:** Repos no longer store a PC-specific path on the server; on the desktop app you point each repo at its folder on that machine (remembered locally). Scans skip the shared example folders (9496, ClimbExamples, 118, 2910) and automatically link detected robot folders to matching tracked robots when the match is unambiguous.

### Theme export = 2 seed colors; new admin-only /settings page (absorbs /admin)

**User messages:** (1) The theme export should just export the 2 main colors (primary and secondary) that I had set. (2) The export should not be in the selector at the top, it should be within settings; also make /settings a larger page with subpages like /settings/themes to set the themes and another tab for the steps and other tabs for other things. Clarifications: the settings page should hold admin settings and be locked behind admin login, with a Users (admin) tab; migration choice "Absorb /admin only" (move the admin editors into /settings tabs; keep /account separate).

**Work and decisions:**
1. Export as two seed colors: exportThemeColors(theme, customThemes) (web/src/theme.tsx) now returns just { primary, secondary } - a custom theme's stored seeds, else the live --accent / --blue for built-ins. parseThemeImport prefers a hex-validated { primary, secondary } pair and regenerates the whole palette for both color modes via generateTheme; a bare/legacy { bg, accent, ... } map is still accepted. injectImportedThemes emits per-mode [data-color-mode] blocks for a seed pair and a single mode-agnostic block (bg-image none) for a legacy map. (These edits were completed earlier; built and shipped this session.)
2. New page web/src/pages/SettingsPage.tsx, admin-only (gated on user.admin exactly like the old AdminPage), tabbed via a .tab-bar segmented control: Themes / Workflow steps / Users. Routes /settings and /settings/:tab; /settings redirects to /settings/themes; an unknown tab redirects to themes. The three editors (StepsEditor, ThemesEditor, UsersEditor) and the adminReq/adminPut/slug/uniqueId helpers were moved verbatim from AdminPage. Added a ThemePicker to the Themes tab: an active-theme grid (click to select), a color-mode toggle, "Copy colors as JSON" (exportThemeColors), an inline "Import colors from JSON" textarea, and per-imported-theme delete. AdminPage.tsx deleted.
3. App.tsx: removed the AdminPage import/route; added SettingsPage routes; /admin now redirects to /settings; added a "Settings" nav link shown only when user.admin. The titlebar ThemeButton right-click menu is now SELECTION-ONLY - the copy/import actions, the paste modal, and the imported-theme delete were removed (all now live in Settings > Themes). Removed the now-unused exportThemeColors import and the copied/import state from ThemeButton.
4. Added .settings-theme-grid / .settings-theme-chip / .settings-theme-pick / .settings-theme-label / .settings-import CSS (styles.css).

**Decision note:** /settings is fully admin-gated per the explicit request, so the color export/import now lives behind admin login. This is acceptable because the app is effectively single-admin (the owner). The titlebar theme menu stays available to everyone as a pure quick-switch.

**Verification:** npm run build (tsc + vite) passed. Ran the web dev server: no console errors on load; the theme right-click menu renders selection-only (Default + Cloud, no export/import); the "Settings" nav link is correctly hidden when signed out (not admin); navigating to /#/settings does not crash (shows the sign-in gate as expected). Admin-only tab content not exercised locally (requires Google OAuth against the live server).

**Files changed:** web/src/pages/SettingsPage.tsx (new), web/src/pages/AdminPage.tsx (deleted), web/src/App.tsx, web/src/theme.tsx, web/src/styles.css, CLAUDE.md, AI_CONTEXT.txt, AI_ACTIVITY_LOG.md.

**User-facing outcome:** "Copy colors as JSON" now exports just the two seed colors you set. Admins get a nav-linked Settings page with Themes / Workflow steps / Users tabs; the theme export and import moved out of the top theme selector into Settings > Themes. The old /admin URL redirects to /settings.

### Theme export as an array of named seed pairs

**User message:** Showed the desired export shape: `[{"name": "Sunset", "primary": "#c2410c", "secondary": "#fbbf24"}]` — "export should look like this".

**Work and decisions:** Changed exportThemeColors (web/src/theme.tsx) to return a one-element array `[{ name, primary, secondary }]` instead of a bare `{ primary, secondary }`. name is the theme's label, so the signature gained an allThemes arg (id -> label lookup); primary/secondary are the stored custom seeds, else the live --accent/--blue for built-ins. The array shape also lets several themes be pasted at once. Rewrote parseThemeImport to return ParsedTheme[] via a new parseOneTheme helper: it accepts the exported array `[{name, primary, secondary}]`, a single seed-pair object `{name?, primary, secondary}`, and (legacy) a bare `{bg, accent, ...}` CSS-var map; name or theme is read as the label. importTheme now returns ImportedTheme[] (imports every parsed entry, de-duping ids); SettingsPage doImport selects the first created theme. Updated the import block copy + placeholder to the array/name shape.

**Verification:** npm run build (tsc strict + vite) passed. Validated the parser against the user's exact example plus a single-object and a legacy-map input via a standalone node script: array -> [{label:"Sunset",primary:"#c2410c",secondary:"#fbbf24"}], single -> one entry, legacy -> {label:"Imported",colors:{...}}. The Themes tab is admin-gated (needs OAuth against the live server), so the copy button itself was not exercised live.

**Files changed:** web/src/theme.tsx, web/src/pages/SettingsPage.tsx, CLAUDE.md, AI_CONTEXT.txt, AI_ACTIVITY_LOG.md.

**User-facing outcome:** "Copy colors as JSON" now produces `[{"name": "<theme>", "primary": "#…", "secondary": "#…"}]`, and import accepts that array (one or many themes), a single seed-pair object, or a legacy color map.

### Simplify /robots page: derived status, color-coded game, per-game tables, repo button

**User message:** Simplify the /robots page. The status should be next to the progress bar and should autofill from the progress and yet be able to manually changed (without the arrow though). The Mod-Type should be removed as well, the game should be color coded like the mod type was, and separate the game year a bit, maybe with a space and it split up into separate tables. Furthermore, the sort option should not show Year (then team #), just Year (remove the Game sort option because it's the same). The repo should be a clickable button.

**Clarifying questions asked and answers:** (1) Status autofill mapping — user picked 0%=Planned/100%=Released/else In Unity, with Semi-Functional as the one manual-only status (not derivable from checkmarks), plus a special case: the In Unity label reads "Simplifying Model" while the current active step is the first workflow step (model-prep), else "In Unity". (2) Manual overrides should always re-derive live from progress, not stick permanently. (3) Split into one table per game (heading + table), repo button opens repo.remoteUrl in a new tab.

**Work and decisions:**
1. web/src/pages/RobotsPage.tsx rewritten. Removed the Mod Type column/pill entirely (MODTYPE_META/MODTYPE_OPTIONS still used elsewhere, untouched). Added `deriveStatus(robot, pct)` (planned/released at the 0%/100% edges, in-unity between, semi-functional preserved as sticky/manual) and `statusOptions(robot)` which swaps the In Unity label to "Simplifying Model" when the first incomplete step is STEPS[0]. `RobotRow` now has a `useEffect` that silently persists the derived status via `api.updateRobot` whenever it drifts from the stored value (canEdit-gated), so status stays accurate even when progress changes elsewhere (Splits, Compact run mode) without a status write. The PillSelect's manual `onChange` (`handleStatusChange`) reuses the existing "upgrade cascades progress" pattern from RobotDetailPage: picking Planned clears all sub-steps, Released checks all of them, In Unity nudges one sub-step on if currently at 0% (so it doesn't immediately re-derive back to Planned), and Semi-Functional just sets the field directly (no progress change, since it isn't derivable).
2. Status + Progress merged into one "Progress" column/cell (`.cell-progress`: bar, %, then the status pill inline) so status sits directly next to the bar as asked; the per-step hint moved under that combined cell.
3. Game column now renders a color-coded pill (`gameClassName()` rotates through 5 existing pill hue families — released/planned/semi/official/claimed — keyed by a game's index in `GAMES`, hashed as a fallback for unknown games) with year and title split into separate `<span>`s (`gameParts()` splits on the colon) for visual separation.
4. The robot list is grouped by game and rendered as one heading (`.game-table-heading`, same color-coded pill styling) + one `<table>` per game, ordered newest-year-first by default (or following the Year sort's direction when that's the active sort key).
5. Sort dropdown: removed the "Game" option (redundant now that tables are already split by game) and renamed "Year (then team #)" to just "Year"; `SortKey` type and the switch statement's `'game'` case were dropped accordingly. The Game/Year filter dropdowns above the tables were left as-is (not part of the sort-option ask).
6. Repo cell is now a real button: `<a className="btn subtle repo-btn" href={repo.remoteUrl} target="_blank">` (stopPropagation so it doesn't trigger the row's navigate-to-detail click) when the repo has a remote URL, else a muted repo name / em dash.
7. web/src/components/Select.tsx + PillSelect.tsx: added an optional `hideChevron` prop that omits the `.dd-chev` arrow span while keeping the trigger clickable — used only on the Progress-column status pill per the "without the arrow" ask.
8. styles.css: added `.game-pill`, `.game-year`, `.game-title`, `.game-table-group`, `.game-table-heading`, `.gm-planned/.gm-released/.gm-semi/.gm-official/.gm-claimed` (reusing existing `--pill-*` CSS vars), `.repo-btn`; `.cell-progress` gained `flex-wrap` + a taller `min-width` to fit the added pill, and `.progress.small` got a `min-width` so the bar doesn't collapse when wrapping.

**Verification:** `npx tsc --noEmit` and `npm run build` (tsc + vite) both passed clean. Live browser verification was not possible: the app requires real Google OAuth sign-in before any authenticated page (including /robots) renders, and no backend/OAuth credentials are available in this environment — confirmed the dev server serves the sign-in gate correctly and logged no console errors, but the robots table itself (derived status, per-game grouping, repo button) was verified by code review only, not pixels.

**Files changed:** web/src/pages/RobotsPage.tsx, web/src/components/Select.tsx, web/src/components/PillSelect.tsx, web/src/styles.css, CLAUDE.md, AI_ACTIVITY_LOG.md.

**User-facing outcome:** /robots now shows one table per game (color-coded heading with the year and title spaced apart), no Mod Type column, a color-coded Game pill per row, a Progress column that combines the bar with a status pill (no dropdown arrow) that auto-fills from checkmark progress but can still be picked manually, a clickable Repo button linking out to the repo's remote URL, and a trimmed sort dropdown (Year, Team #, Progress, Status, Date added — no more redundant Game option).

### AI Prompt Builder replaces AI script generator; drop AI_CONTEXT.txt

**User messages (sequential, same task):** (1) "I would like to change the functionality of the ai script generator in the robot page. First of all, the result of the generator should persist between reloads and even when cache is cleared. Second of all, I don't want it to generate a full script, I want it to generate a detailed prompt of directions, the source files of the robot's irl github AND the files of the robotframework (C:\Users\Seb\Desktop\MoSim-Reefscape-Public\Assets\Scripts\RobotFramework on my pc, should let user input theirs). These 2 resourecs should only be there for reference and the prompt should fully explain what is needed so the user can paste the full prompt into any ai model of choice and have it work." (2) "It should also have my uploaded .cs scripts at a webhook so it can include those reference scripts linked when prompting other ai models" (3) "remoev the video feature. the prompt should be specific to the robot and include what is needed," (4) "update claude.md, remove ai_context, uptate ai_activity_log, add updating activity log and claude.md into claude.md".

**Work and decisions:**
1. Replaced the old "call an AI provider to write a script" flow with a deterministic, no-network prompt builder. New `web/src/ai/promptBuilder.ts` `buildRobotPrompt()` (pure function) assembles one copy-pasteable prompt: task directions, the embedded `MOSIM_SYSTEM_PROMPT` scripting rules, the manual description, then a clearly labeled `# Reference material below (context only)` section with reference-only source groups.
2. Reference sources bundled: the team's real GitHub repo (`lib/github.ts` `fetchRepoSource`, unchanged fetch logic, embedded inline); a local RobotFramework checkout via a new per-device path setting (`web/src/lib/frameworkPath.ts`, localStorage `mosim-framework-path`) scanned by a new generic Tauri command `list_cs_files` (`src-tauri/src/commands.rs`, registered in `lib.rs`, reuses the existing `SKIP` dir list and the existing `read_script` command to fetch content), embedded inline; other `.cs` files from the robot's linked repo (existing disk-scan path), embedded inline.
3. Saved script-library entries are referenced by LINK, not pasted inline, per message (2): new public route `GET /api/scripts/:id/raw` in `server/api.js` (unauthenticated, keyed by the script's existing unguessable UUID `id` — same trust model this codebase already uses for `/robot/:id` and `/u/:uid`), backed by a new `getById(table, id)` helper in `server/db.js`. The prompt builder emits `- name — url` lines instead of file content.
4. Per message (3), removed the video-link feature entirely: deleted `videos` state/textarea and the Gemini video-fileData code path (`isYouTubeUrl`, `buildPrompt`, `callGemini`, `generateScript`, `GenerateInput`) from `web/src/ai/client.ts`. That module now only backs ScriptsPage's "AI describe" auto-summary (`analyzeScript`, `providerConfigured`, provider settings) — flagged as a gap: there is no longer any UI in the app to configure an AI provider/key for a fresh install.
5. Persistence per message (1): added `aiPrompt?: string` to the `Robot` type (`web/src/types.ts`, no server migration needed since rows are JSON blobs); `AiScriptPanel.tsx` saves the built prompt via the existing `api.updateRobot(id, {aiPrompt})` on every build and on Clear, and loads `robot.aiPrompt` on mount/robot-change — so it survives reloads and browser cache clears, not just localStorage.
6. `web/src/components/AiScriptPanel.tsx` fully rewritten around the above: description textarea, GitHub repo URL field, desktop-only RobotFramework path + scan + per-file include/exclude checkboxes, script-library include/exclude checkboxes (now showing link targets), repo-disk-scripts opt-in checkboxes (desktop), Build/Copy/Clear actions, and the persisted output.
7. Per message (4): deleted the separate `AI_CONTEXT.txt` mirror file. `CLAUDE.md` is now documented as the single authoritative AI context file — updated its own "Approach" section (top of file) and the "Keep this file up to date" banner to drop all `AI_CONTEXT.txt` references and explicitly say updating `CLAUDE.md` + `AI_ACTIVITY_LOG.md` is part of completing each work item, not a separate ask. Updated this log's own "Logging rules" section to match. Rewrote the affected `CLAUDE.md` sections (repository layout, `Robot` type, `ai/` and `AiScriptPanel.tsx`/`lib/` entries, server `api.js`/`db.js` entries, and a rewritten "AI Prompt Builder" + "AI client" implementation-notes section) plus a new Session Notes entry.

**Verification:** `npm run build` (tsc + vite) in `web/` passed (76 modules, no TS errors). `node --check server/api.js` and `node --check server/db.js` passed. Rust changes (`commands.rs`, `lib.rs`) were reviewed by hand only — no local Rust/Tauri toolchain available to compile against, consistent with this repo's established pattern for Rust-only changes. No runtime/browser smoke test was performed this session: the framework-folder-scan and repo-disk-read code paths are desktop/Tauri-only and cannot be exercised from the plain web dev-server preview; the web-facing flow (description/source-repo/script-library-link build, persisted-prompt reload) was not smoke-tested live either.

**Decisions flagged to the user as not explicitly requested:** (a) the new `/api/scripts/:id/raw` route is public/unauthenticated (id-guessing or a leaked prompt could expose a script's content) — chosen to keep the "paste anywhere" prompt usable by any target AI without requiring that AI to authenticate; (b) removing the old generator flow left `ScriptsPage`'s "AI describe" feature with no in-app way to configure a provider key on a fresh install.

**Files changed:** `server/db.js`, `server/api.js`, `web/src/types.ts`, `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`, `web/src/lib/desktop.ts`, `web/src/desktop.d.ts`, `web/src/lib/frameworkPath.ts` (new), `web/src/ai/client.ts`, `web/src/ai/promptBuilder.ts` (new), `web/src/components/AiScriptPanel.tsx` (rewritten), `CLAUDE.md`, `AI_ACTIVITY_LOG.md`. `AI_CONTEXT.txt` deleted.

**User-facing outcome:** The robot detail page's AI panel now builds a single, self-contained "AI Prompt Builder" prompt (no in-app AI call) combining your description, the real GitHub repo, your local RobotFramework source, and linked library scripts, which you paste into any AI model yourself; the result is saved to that robot and survives reloads/cache clears. `AI_CONTEXT.txt` is gone — `CLAUDE.md` is the one context file to keep current going forward, alongside this activity log.

### Editable, year-scoped modpacks

**User message:** "The modpacks should be able to be edited, they should reflect a specific year as well and should only be able to be attached to robots of that year."

**Work and decisions:**
1. Modpacks already stored a `game` field (which encodes the year+season, e.g. "2025: Reefscape") but had no edit UI. Added inline editing to `web/src/pages/ModpacksPage.tsx`: an "Edit" button per row swaps that row into a form (name/game/description, reusing the same `add-form` styling) with Save/Cancel, calling the existing `api.updateModpack(id, patch)`.
2. If a pack's game is changed while it still has member robots, `saveEdit` now asks for confirmation (`confirmDialog`) explaining the members will be detached, then calls `api.setRobotModpack(r.id, null)` for each member after the update succeeds — since a robot can only belong to a modpack from its own year.
3. Enforced "only attachable to robots of that year" wherever a robot picks a modpack:
   - `web/src/components/RobotForm.tsx`: the modpack dropdown is filtered to `modpacks.filter(m => m.game === game)`; a new `changeGame()` handler clears an already-selected modpack if it no longer matches the newly picked game; the inline "+ New" modpack mini-form now defaults its game to the robot's current game when opened.
   - `web/src/pages/RobotDetailPage.tsx`: the Modpack `Select` is filtered to `modpacks.filter(m => m.game === robot.game)`; blurring the (free-text) Game field now also detaches an existing modpack via `api.setRobotModpack(robot.id, null)` if its game no longer matches the new value.
4. No server-side validation was added for this restriction (matches the existing pattern where similar fields, e.g. team-number format, are also only validated client-side; this is a single-owner-per-uid app, not multi-tenant).

**Verification:** `npm run build` (tsc + vite) in `web/` passed with no errors. Loaded the Vite dev server in the browser preview pane; page loaded with no console errors. Full interactive click-through of the new edit/filter UI was not exercised because the app requires real Google OAuth sign-in, unavailable in this environment (same limitation noted in prior sessions).

**Files changed:** `web/src/pages/ModpacksPage.tsx`, `web/src/components/RobotForm.tsx`, `web/src/pages/RobotDetailPage.tsx`, `CLAUDE.md`, `AI_ACTIVITY_LOG.md`.

### Simplify /robots page

**User message:** "Simplify the /robots page. The status should be next to the progress bar and should autofill from the progress and yet be able to manually changed (without the arrow though). The Mod-Type should be remoed as well, the game should be color coded like the mod type was, and separate the game year a bit, maybe with a space and it split up into separate tables. Furthermore, the sort option should not show Year (then team #). it should just be year (and remove game because it is the same.) The repo should be a clickable button. Ask questions if needed."

**Clarifying questions asked and answers:** (1) Status-autofill mapping — answered: derive 0%=Planned/100%=Released/else=In Unity, plus label In Unity as "Simplifying Model" while the active step is the first workflow step. (2) Whether a manual override should persist against later progress changes — answered: always follow progress automatically. (3) Table-split granularity and repo-button behavior — answered: one table per game, repo button opens `remoteUrl` in a new tab.

**Work and decisions:**
1. `RobotsPage.tsx`: merged Status into the Progress column (next to the bar) using `PillSelect`'s new `hideChevron` prop; `deriveStatus()` computes the pill from `robotProgress()`, with Semi-Functional as the one manual/sticky exception; a `useEffect` in `RobotRow` keeps `robot.status` synced to the derived value so it reflects progress made anywhere in the app. Manual picks on the pill (`handleStatusChange`) don't set status directly for the three derivable values — they mutate the underlying sub-step checkmarks (clear all / check all / nudge one on) so the derived status naturally lands where the user picked, matching the existing upgrade-cascade pattern in `RobotDetailPage.tsx`.
2. Removed the Mod Type column and its `PillSelect` entirely from the row and header.
3. Game column became a color-coded pill (`gameClassName()` indexes into the same hue-family classes used for status pills) with the year and title in separate `<span>`s (`gameParts()` splits on `:`) for visual spacing.
4. Replaced the single combined table with one table per game (`gameOrder`, grouped and headed by a color-coded `<h2>` using the same pill classes).
5. Sort dropdown: renamed "Year (then team #)" to "Year"; removed the "Game" sort option (redundant once tables are already split by game).
6. Repo cell renders as a link-styled button (`.repo-btn`) opening `repo.remoteUrl` in a new tab, `stopPropagation`'d so it doesn't also trigger the row's navigate-to-detail click.
7. Added `hideChevron?: boolean` to `Select.tsx`/`PillSelect.tsx` so a pill can render without its dropdown arrow while staying clickable.

**Verification:** `tsc --noEmit` and `npm run build` (tsc+vite) both passed in `web/`. Live browser verification wasn't possible — `/robots` is behind `RequireAuth` (real Google OAuth) and no credentials/backend are configured in this sandbox.

**Files changed:** `web/src/pages/RobotsPage.tsx`, `web/src/components/Select.tsx`, `web/src/components/PillSelect.tsx`, `web/src/styles.css`, `CLAUDE.md`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** `/robots` now shows one color-coded table per game, status lives next to the progress bar and auto-tracks it (still manually adjustable, no stray arrow), Mod Type is gone, the sort dropdown is trimmed, and Repo is a real clickable button.

### Robots-page follow-up: uniform columns, drop tabs/Comments, Game dropdown

**User messages (sent together in one turn):** "The colums should all be uniform on all of these. also remove the comments" / "Also remove the in progress tab and show all by default and allow sorting" / "The game part in the robot edit menu should be a dropdown not a textbox"

**Work and decisions:**
1. `web/src/styles.css`: `.tracker-table` switched to `table-layout: fixed` with `nth-child`-keyed percentage widths per column (9/19/16/18/14/24%), so every per-game table's columns line up identically regardless of that game's own content lengths (previously each table auto-sized independently, producing visibly different column widths per game, per user screenshot). Added `overflow:hidden; text-overflow:ellipsis` to `.col-name`, `.col-pack`, and `.repo-btn` so long text truncates instead of breaking the fixed layout.
2. Removed the Comments column (`<th>Comments</th>` and the `col-comments`/`comment-preview` `<td>`) from `RobotsPage.tsx` entirely.
3. Removed the In Progress / All tab bar from `RobotsPage.tsx`: dropped the `Tab` type, `tab` state, `isInProgress`/`base` filtering, and `inProgressCount`; the page now always starts from the full `robots` list before filters/sort apply. The status filter `Select` (previously only rendered when `tab === 'all'`) is now always shown.
4. `RobotDetailPage.tsx`: replaced the free-text Game `<input>` in the metadata panel with a `Select` sourced from `GAMES` (imported from `../types`), matching `RobotForm.tsx`'s add-robot game picker; kept the existing modpack-detach-on-game-change side effect in the `onChange` handler.

**Verification:** `tsc --noEmit` and `npm run build` (tsc+vite) both passed in `web/` after these changes. Live browser verification wasn't possible for the same reason as the prior entry (Google OAuth wall, no credentials configured here).

**Files changed:** `web/src/pages/RobotsPage.tsx`, `web/src/pages/RobotDetailPage.tsx`, `web/src/styles.css`, `CLAUDE.md`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** Every per-game table on `/robots` now has identically aligned columns, the Comments column and the In Progress/All tabs are gone (all robots always show, sorting/filtering still works), and the Game field on a robot's detail page is now a proper dropdown instead of free text.

### Remove remaining Mod Type UI; confirm team-suffix TBA behavior

**User messages:** "mod type is still here. it shouldn't be." (with a screenshot showing the add-robot form's "Mod type: —" dropdown) / "I should be able to add suffixes to robots, such as 694a and 694b and 694c and it should cut the suffix out when pulling from tba. this is for if i have multiple robots from the same team"

**Work and decisions:**
1. The Mod Type column was removed from `/robots` in an earlier entry, but the control still existed in two other places: the add-robot form (`RobotForm.tsx`) and the robot detail edit panel (`RobotDetailPage.tsx`). Removed the `Select`/`PillSelect` control, `modType` state, and `MODTYPE_OPTIONS` from both. `RobotForm.tsx`'s `addRobot` call now passes `modType: ''` (the type still requires the field). Left `Robot.modType` in `types.ts`/the DB schema untouched — only the UI for setting/viewing it was removed, so existing data isn't affected.
2. Investigated the suffix request before writing any code, since it looked already-implemented: `web/src/lib/tba.ts` `baseTeamNumber()` already regex-strips a trailing letter (`"694a"` → `"694"`) before the TBA proxy call; the team `<input>` in `RobotForm.tsx` is already free text (placeholder literally says "e.g. 9496 or 9496b"); and `RobotsPage.tsx`'s `compareTeams()` already numeric-sorts with an alphabetical tie-break on the full string. Verified the regex behavior directly (`node -e`) rather than asserting from memory. No code change was needed or made for this part.

**Verification:** `tsc --noEmit` and `npm run build` (tsc+vite) both passed in `web/` after the Mod Type removal.

**Files changed:** `web/src/components/RobotForm.tsx`, `web/src/pages/RobotDetailPage.tsx`, `CLAUDE.md`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** Mod Type no longer appears anywhere in the app (add form or detail page). Team-number suffixes like `694a`/`694b`/`694c` were confirmed to already work end-to-end — they display as entered, sort correctly next to each other, and the TBA nickname lookup already ignores the suffix.

### Impeccable pipeline: document → audit → polish

**User messages:** "follow what i said earlier. document. then audit. then polish and refine. then enhance. along the way, fix whats needed." (confirming, mid-pipeline, that I should proceed from the delivered audit straight into polish rather than pausing for review)

**Work and decisions:**
1. `document` (Scan mode — mature existing visual system, not greenfield): generated `DESIGN.md` and `.impeccable/design.json`, capturing the app's colors, typography, layout, elevation, shapes, and components as they actually exist in `styles.css`/`theme.tsx`/components.
2. `audit`: ran technical quality checks and returned a scored, prioritized report (accessibility, theming, responsive, code cleanliness) without fixing anything, per the audit command's scope.
3. `polish`, following `polish.md`'s triage order (functional/accessibility blockers, then design-system drift, then visual/motion, then cleanup):
   - Made `Splits.tsx`'s step header and `RobotsPage.tsx`'s clickable row keyboard-operable (`role`, `tabIndex`, `onKeyDown`, `aria-expanded`/`aria-label`); added `aria-checked` to the step's check button; added `aria-label` to `RobotForm.tsx`'s two unlabeled inputs and `CompactPage.tsx`'s three icon-only buttons; gave five user-photo `<img alt="">` instances a real description (left the app-logo `alt=""` instances alone — correctly decorative next to visible brand text); fixed `RobotDetailPage.tsx`'s h1→h3 heading skip by promoting its and `Splits.tsx`'s section headers to `h2`, matching every other page's pattern.
   - Fixed `.check.checked` in `styles.css`, which hardcoded GitHub-green regardless of theme (a real violation of DESIGN.md's own "One Accent Rule" — stayed green under Cloud's purple accent) to use `var(--accent)`/`color-mix(...)`/`var(--accent-contrast)`, mirroring `.btn.primary`. Fixed `.banner.info`/`.banner.error`, which hardcoded the default theme's exact blue/red hex+alpha, to use `color-mix(in srgb, var(--blue|red) N%, transparent)` so banners recolor under other themes. Fixed two stray `color: #fff` literals to `var(--accent-contrast)`.
   - Reviewed the Cloud theme's own bespoke gradient topbar/titlebar/background hardcoded hex (~5 of the audit's ~19 "hardcoded hex" hits) and left it as-is — it's an intentional, theme-scoped decorative flourish, not a component hardcoding one theme's colors onto another.
   - Self-caught and fixed a factual error in my own earlier `document` output: `DESIGN.md`/`design.json` had claimed "the dark theme's shadow is missing/none," but re-checking `styles.css` showed only `cloud`+`dark` lacks a shadow — `default` (both modes) and `cloud`+`light` all have real shadow values. Corrected both files.

**Verification:** `npm run build` (tsc+vite) passed clean in `web/`; `node -e "JSON.parse(...)"` confirmed `.impeccable/design.json` stayed valid JSON. Loaded the dev server in the browser preview: HomePage (the only page not behind `RequireAuth`) rendered with no console errors and an intact accessibility tree. The auth-gated pages could not be exercised live (no Google OAuth credentials in this sandbox) — verified there via build/type-check and code review only. The pipeline's `enhance` stage was not reached this session.

**Files changed:** `DESIGN.md`, `.impeccable/design.json`, `web/src/components/Splits.tsx`, `web/src/components/RobotForm.tsx`, `web/src/components/AuthButton.tsx`, `web/src/pages/RobotsPage.tsx`, `web/src/pages/CompactPage.tsx`, `web/src/pages/UserProfilePage.tsx`, `web/src/pages/SettingsPage.tsx`, `web/src/pages/HomePage.tsx`, `web/src/pages/AccountPage.tsx`, `web/src/pages/RobotDetailPage.tsx`, `web/src/styles.css`, `CLAUDE.md`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** Keyboard and screen-reader users can now operate the step accordion, the robots-table row click-through, the compact overlay's icon buttons, and the add-robot form; user avatars announce whose photo they are; the robot detail page's heading order is no longer broken. The checked-step indicator and info/error banners now correctly follow the active theme's accent/blue/red instead of showing a fixed color under every theme.

### Impeccable pipeline: enhance (typeset)

**User messages:** "proceed"

**Work and decisions:**
1. Scoped `enhance` to typeset, since DESIGN.md already named a specific, unfinished target (the Rising Weight Rule: h1 700/28-32px, h2 700/20px, h3 650/15px) rather than inventing new enhance work.
2. Checked actual computed styles in the browser before touching anything, rather than trusting the earlier `document` pass's claim that headings were "body-matched weight (400)": h1/h2/h3 were already rendering bold (700) via the browser's default UA stylesheet, since `styles.css` never set `font-weight` on them. The real gap was only size (h1 at 22px vs. the ~28-32px target, h3 at 14px vs. 15px) and h2 having no explicit rule at all.
3. Set explicit `font-size`/`font-weight` on `h1`/`h2`/`h3` in `styles.css` to the documented target, so the hierarchy no longer depends on browser defaults. Corrected DESIGN.md's Typography/Overview sections and `.impeccable/design.json`'s `typographyMeta`/`narrative.rules` to describe the now-realized state instead of a pending transition — the same self-correction pattern used earlier this session for the shadow-token claim.
4. Did not pursue animate/colorize/layout/delight/overdrive this pass — nothing in DESIGN.md names a gap in those categories for this dense, Operate-mode utility app, and manufacturing one would be scope creep beyond what was asked.

**Verification:** `npm run build` (tsc+vite) passed clean; `.impeccable/design.json` re-validated as JSON; reloaded the dev server in the browser preview and confirmed via computed-style inspection (`getComputedStyle`) that the global `h1`/`h2`/`h3` rules carry the target size/weight, with no console errors. A visual screenshot wasn't available in this sandbox (Browser pane compositing timeout) — verified via computed styles instead of pixels.

**Files changed:** `web/src/styles.css`, `DESIGN.md`, `.impeccable/design.json`, `CLAUDE.md`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** Page titles, section headers, and card/subsection headers now render at the size/weight DESIGN.md had already committed to as the app's intended hierarchy, instead of relying on the browser's default heading styles for part of that scale.

**User-facing outcome:** Modpacks can now be edited in place (name, game/year, description) from the Modpacks page. A modpack's game/year is enforced everywhere a robot is attached to one: the modpack picker on both the add-robot form and the robot detail page only offers packs matching the robot's own game, and changing a robot's (or a modpack's) game automatically detaches any now-mismatched pack, with a confirmation when that would affect existing members.

## 2026-08-03 — Add a way to change profile photo

**User message:** "Add a way to change pfp"

**Work and decisions:** Profile photo previously only ever came from the OAuth
provider (Google/GitHub/Discord `photo` field, upserted into the `profiles` table on
primary sign-in) with no in-app override UI, even though `profiles.photo` and
`GET /api/me`'s `photo: profile?.photo ?? photo` already supported a stored override
transparently. Added a photo picker to the shared `ProfileForm.tsx` (used on both the
Account page and the first-time ProfileSetup modal): clicking the avatar or "Upload
photo" opens a file picker; a new `web/src/lib/image.ts` `resizeImageFile()` crops to
a centered square, downsamples to 256x256, and re-encodes as a JPEG data URI
client-side (keeps payloads small and clear of the server's 600kb JSON body cap) for
instant preview; a "Remove" button clears the override back to the sign-in provider's
photo. `PUT /api/profile` (`server/api.js`) now accepts an optional `photo` field:
`null`/`''` resets to `req.user.photo` (the live provider photo), a `data:image/
(png|jpeg|webp);base64,...` string under 400,000 chars is stored, anything else is
rejected with 400. Omitting `photo` from the request (the existing behavior for plain
name/handle edits) leaves the stored photo untouched. Updated the
`Backend.updateProfile`/`HTTPBackend.updateProfile` TS signatures to add the optional
`photo` field, and refreshed a stale `AccountPage.tsx` header comment that had called
photo read-only.

**Verification:** `npm run build` (tsc+vite) passed clean in `web/`; `node --check
server/api.js` passed. Loaded the dev server in the browser preview — no console
errors on load. `/account` and the ProfileSetup modal are both behind `RequireAuth`
(real Google OAuth), so the actual upload/preview/remove/save round trip could not be
exercised live in this sandbox — verified via code review and type-check only,
consistent with this repo's established pattern for auth-gated pages.

**Files changed:** `web/src/lib/image.ts` (new), `web/src/components/ProfileForm.tsx`,
`web/src/store/backend.ts`, `web/src/store/http.ts`, `web/src/pages/AccountPage.tsx`,
`web/src/styles.css`, `server/api.js`, `CLAUDE.md`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** On the Account page (and during first-time profile setup),
users can now click their avatar or an "Upload photo" button to pick an image file,
see an instant cropped preview, and save it as their profile photo (shown in the
account identity block, the community directory, and public robot/profile embeds) —
or hit "Remove" to revert to whatever photo their sign-in provider supplies.

## 2026-08-03 — Public modpack showcase pages (/packs) + co-authors

**User messages (this feature, across the session):** "i want an option to have a
separate webpage for each modpack. this page should have a carousel of videos and/or
images at the top right under the modpack name, then under that space for a paragraph
or two of text and a 'download on mosim's website' button. all the modpacks with pages
should be visible on a /modpacks page that only shows modpacks with pages. at the
bottom have a 'view modpacks by other people on mosims website' button. use impeccable
to design" — then, after routing/media/CTA decisions were made — "it shouldn't be /:id
it should be a string that i set" (user-chosen slugs, not internal ids) — then "each
pack should have an author but the author of the pack can add other authors".

**Work and decisions:** Private modpack management stays at `/modpacks` (unchanged,
behind sign-in); a new PUBLIC showcase went at `/packs` (grid of cards) with individual
pages at `/packs/:slug` (SPA) — `slug` is a user-chosen string per modpack (format
`/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/`, globally unique), not the internal uuid, set
from a "🖼️ Add page" panel on each modpack row in `ModpacksPage.tsx`. Media is real file
uploads (not pasted URLs) via `multer` (diskStorage, uuid filenames, image/video
mimetype allowlist, 60MB cap) to a new `/uploads` mount, server-tracked as
`Modpack.media: ModpackMedia[]`. The download button and the "view modpacks by other
people" button both link to one fixed URL, `https://mosimulator.com/modding`. A new
server route `GET /pack/:slug` (real path, mirrors the existing `/robot/:id`/`/u/:uid`
pattern) renders a per-pack Open Graph embed for public pack pages.

Co-authors (added mid-session): the modpack owner can credit other signed-up users as
co-authors via email lookup against the `profiles` table (`POST
/modpacks/:id/authors`, owner-only, dedupes, 400s if the email doesn't match a known
user or is already the owner/an existing co-author) and remove them (`DELETE
/modpacks/:id/authors/:uid`). Stored denormalized on the modpack as `coAuthors:
{uid,displayName,email}[]` (snapshot at add-time, consistent with this codebase's
existing denormalization pattern e.g. `Robot.modpackPrivate`) rather than requiring a
live join — trades eventual display-name staleness for not needing a new public lookup
endpoint. `PublicPack.ownerDisplayName: string` was replaced with `authors:
{uid,displayName}[]` (owner first, then co-authors), consumed by both `PacksPage.tsx`
and `PackPage.tsx` as a comma-joined byline. Added a co-author add/remove UI (email
input + chip list with a remove button per co-author) inside `ModpacksPage.tsx`'s
existing page-management panel.

Also fixed a real deploy gap found along the way: multer's 60MB upload cap would be
silently rejected by nginx's default 1MB `client_max_body_size`. Added the directive
to `server/manage.sh`'s generated nginx config and made `cmd_deploy()` re-apply nginx
config on every deploy (previously it was write-once at `cmd_setup` time only), so
already-live droplets pick up the fix without a manual step.

Used the `impeccable` skill for the public pages' visual design: `.pack-grid`/
`.pack-card` (staggered fade-up entrance matching `.community-card`), a `.pack-carousel`
component (prev/next nav, dot indicators, image/video support), and page CSS
(`.pack-page-head`, `.pack-page-desc`, `.pack-page-download`), following the project's
existing CSS-variable token system.

**Verification:** `npm run build` (tsc+vite) passed clean in `web/` after all changes,
including the co-author addition (fixed two stale `PublicPack.ownerDisplayName`
references in `PacksPage.tsx`/`PackPage.tsx` that the field rename broke). `node
--check server/api.js` and `server/db.js` passed. The design-quality hook's one finding
(`gradient-text` on the pre-existing Instagram brand label, shifted to a new line
number by the CSS insertion) was reviewed and left unchanged — it's the same
already-documented false positive from earlier sessions, not something this change
introduced. `/packs` and `/packs/:slug` are public (no auth), but live interactive
verification (upload flow, slug publish, co-author add/remove) needs a signed-in owner
account and wasn't exercised in this sandbox — verified via build/type-check and code
review, consistent with this repo's established pattern for auth-gated flows.

**Files changed:** `web/src/types.ts`, `web/src/store/backend.ts`,
`web/src/store/http.ts`, `web/src/pages/ModpacksPage.tsx`, `web/src/pages/PacksPage.tsx`
(new), `web/src/pages/PackPage.tsx` (new), `web/src/App.tsx`, `web/src/styles.css`,
`server/api.js`, `server/manage.sh`, `CLAUDE.md`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** Modpack owners can publish a public showcase page for any
modpack at a URL they choose (`/packs/their-slug`), with an uploaded image/video
carousel, a description, and a download button linking to MoSim's website. Every
published (non-private) pack is listed at `/packs`, with a link out to MoSim's own
modpack listing at the bottom. Owners can also credit co-authors by email — they're
shown alongside the owner on both the listing cards and the individual pack page, and
can be added or removed at any time from the modpack's management panel.

## 2026-08-03 — External (untracked) robots + TBA team pills on modpack pages

**User message (verbatim):** "a modpack should have the option for me to add robots
made by other people that arent being tracked by the site. these robots should NOT be
tracked by the site, only on the modpack page

in addition, a section of the modpack page should have pills with info from each team
included (teams with a/b/c/etc multiple robots should only have one pill) pulled from
tba api"

**Visible work performed:**

1. `web/src/types.ts`: added `ExternalRobot {id, team, name?}` and
   `Modpack.externalRobots?: ExternalRobot[]`; added `PublicPack.teams: {number,
   name: string | null}[]`.
2. `server/api.js`:
   - Added owner-only `POST /modpacks/:id/external-robots` (team number regex-validated
     `^\d+[a-z]?$`, optional name) and `DELETE /modpacks/:id/external-robots/:erId`,
     mirroring the existing co-author route pair.
   - Refactored the existing authed TBA proxy's inline caching logic into a shared
     `async tbaLookup(num)` function (same `tbaCache` Map, 24h TTL) so it can be reused
     from a public route without duplicating the cache.
   - Added `baseTeamNum(team)` — a server-side port of the client's
     `lib/tba.ts` `baseTeamNumber()` (strips a trailing rebuild-suffix letter, e.g.
     "694a" -> "694").
   - Rewrote `toPublicPack()` as `async`: it now collects every team on the pack
     (tracked `Robot`s whose `modpackId` matches, plus `externalRobots`), dedupes by
     base team number, and resolves each via `tbaLookup()` in parallel
     (`Promise.all`), returning `{number, name}` (name null when TBA has no record or
     `TBA_AUTH_KEY` isn't configured). `/packs` and `/packs/:slug` handlers became
     `async` to await it.
3. `web/src/store/backend.ts` / `http.ts`: added `addExternalRobot(id, team, name?)`
   and `removeExternalRobot(id, externalId)` to the `Backend` interface and
   `HTTPBackend`, following the existing `add/removeModpackAuthor` pattern (POST/DELETE
   + `_refetch()`).
4. `web/src/pages/ModpacksPage.tsx`: added a second credit-management block inside the
   existing "🖼️ Add page" panel (next to co-authors) — chip list of credited external
   robots (team + optional name, remove button) and a team-number + optional-name add
   form, with its own saving/error state, reset alongside the co-author fields when the
   panel opens.
5. `web/src/pages/PackPage.tsx`: added a "Teams" pills section (`pack.teams`, one
   `.pack-team-pill` per entry showing `number` and, if resolved, `— nickname`)
   rendered between the page head and the media carousel.
6. `web/src/styles.css`: added `.pack-teams` (flex-wrap row) and `.pack-team-pill`
   (12px pill, same visual family as the existing `.pack-chip`/`.game-chip`).

**Decisions:** External robots are stored as plain data on the `Modpack` record, never
as `Robot` rows — satisfies "should NOT be tracked by the site." The external robot's
optional `name` is owner-facing only (shown in the management panel, not on the public
page) — the public page credits purely through team pills, a deliberate scope-narrowing
choice matching exactly the two things asked for. TBA resolution for the public pills
had to bypass `requireAuth` (the pack routes are public/no-auth) — done via a shared,
cached `tbaLookup()` rather than a second unauthenticated proxy endpoint, so there's no
new open-relay surface; it's bounded to the pack's own already-known team numbers, not
attacker-supplied ones from an arbitrary route.

**Verification:** `tsc --noEmit` and `npm run build` (tsc+vite) both passed clean in
`web/`. `node --check server/api.js` passed. The design-quality hook flagged 54
pre-existing findings in `styles.css` on this edit (gradient-text on the Instagram
label, several ad hoc component font-sizes) — all were already-reviewed carryover from
earlier sessions, not introduced by this change; the new `.pack-team-pill` 12px size
follows the same established ad hoc sizing convention as `.pack-chip`/`.game-chip` in
this file, so it was left as-is rather than forced onto a formal type ramp. Live
verification wasn't possible: the owner's add/remove-robot flow is behind real Google
OAuth, and no pack with credited external robots + resolvable TBA teams existed to
browse in this sandbox — verified via code review and type-check only, consistent with
this repo's established pattern for auth-gated flows here.

**Files changed:** `web/src/types.ts`, `server/api.js`, `web/src/store/backend.ts`,
`web/src/store/http.ts`, `web/src/pages/ModpacksPage.tsx`, `web/src/pages/PackPage.tsx`,
`web/src/styles.css`, `CLAUDE.md`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** On each modpack's "🖼️ Add page" management panel, owners can
now credit robots made by other people (team number + optional name) without those
robots ever becoming tracked entries in the site. The modpack's public page
(`/packs/:slug`) shows a row of team pills — one per unique team across both the
owner's tracked robots and these credited robots, with rebuild-suffix duplicates
("694a"/"694b") collapsed into a single pill — each labeled with the team's real name
pulled live from The Blue Alliance.

## 2026-08-05 — Production HTTPS outage: manage.sh clobbering nginx SSL block

**User message:** Shared a screenshot of `mods.sebastianw.tech` showing
`ERR_CONNECTION_REFUSED` in the browser, alongside a terminal showing a deploy that had
just completed successfully ("Deploy complete — https://mods.sebastianw.tech is live").
Asked how to investigate; chose "SSH in and check status" when offered options (my own
SSH access from this environment had no key authorized on the droplet, so the user ran
each diagnostic command themselves and pasted output back).

**Work and decisions:** Walked the diagnosis interactively: `systemctl status
mosim-tracker`/`nginx` showed both services running and nginx listening on port 80 —
but nothing on 443. `nginx -T` and `certbot certificates` showed a valid, non-expired
cert existed but wasn't wired into any active server block. `sites-available/mosim-tracker`
turned out to be HTTP-only, rewritten at the exact deploy timestamp. Root cause: `server/
manage.sh`'s `_write_nginx()` (made to run on every `cmd_deploy`, not just `cmd_setup`,
as of the 2026-08-03 upload-size-cap session) unconditionally overwrites the nginx site
file with an HTTP-only template. It only ever worked because `cmd_setup` runs `certbot
--nginx` right after the first call, which patches the file in place to add HTTPS — but
every subsequent `deploy` since 08-03 silently re-overwrote that patch, and this deploy
finally triggered the outage. Fixed `_write_nginx()` (server/manage.sh) to check for an
existing cert at `/etc/letsencrypt/live/$DOMAIN` and, when present, write the full HTTPS
block itself (80→443 redirect + `ssl_certificate`/`ssl_certificate_key` + certbot's
`options-ssl-nginx.conf`/`ssl-dhparams.pem` if present) on every call, so redeploys are
now idempotent instead of depending on certbot's one-time edit surviving forever.

**Verification:** `bash -n server/manage.sh` passed. Committed and pushed to `main`
(`1f0a034`) after explicit user confirmation. Gave the user the fix-forward command
(`git pull && bash server/manage.sh deploy` on the droplet) plus a verification command
(`ss -tlnp` + `curl -sI https://...`). User ran it and confirmed "all good" — site is
back up over HTTPS.

**Files changed:** `server/manage.sh`, `CLAUDE.md`, `AI_ACTIVITY_LOG.md`.

**User-facing outcome:** Production HTTPS outage on `mods.sebastianw.tech` diagnosed and
resolved; root cause fixed in the repo so future deploys won't repeat it.
