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
