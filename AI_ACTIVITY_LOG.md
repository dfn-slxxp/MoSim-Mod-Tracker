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
