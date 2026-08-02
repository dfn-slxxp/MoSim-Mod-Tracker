---
name: MoSim Mod Tracker
description: A LiveSplit-style progress tracker for FRC robot mods in MoSim, with a public community roster
colors:
  bg: "#0b0e14"
  panel: "#141a24"
  panel-2: "#1a2130"
  border-solid: "#263042"
  text: "#e6e9ef"
  muted: "#8b95a7"
  accent: "#3fb950"
  accent-contrast: "#ffffff"
  blue: "#58a6ff"
  gold: "#d4a72c"
  red: "#f85149"
  titlebar: "#0a0d12"
  pill-planned-bg: "#6e40c926"
  pill-planned-fg: "#c297ff"
  pill-claimed-bg: "#f0883e26"
  pill-claimed-fg: "#ffab70"
  pill-unity-bg: "#d4a72c26"
  pill-unity-fg: "#e3c04c"
  pill-semi-bg: "#3fb95026"
  pill-semi-fg: "#56d364"
  pill-released-bg: "#58a6ff26"
  pill-released-fg: "#79b8ff"
  pill-official-bg: "#db6d2826"
  pill-official-fg: "#f0883e"
typography:
  headline:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.003em"
  label:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0em"
  mono:
    fontFamily: "Consolas, Cascadia Code, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "9px"
  md: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-contrast}"
    rounded: "{rounded.sm}"
    padding: "7px 14px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-contrast}"
  button-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "7px 14px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.red}"
    rounded: "{rounded.sm}"
    padding: "7px 14px"
  pill-status:
    backgroundColor: "{colors.pill-semi-bg}"
    textColor: "{colors.pill-semi-fg}"
    rounded: "{rounded.pill}"
    padding: "4px 22px 4px 12px"
    typography: "{typography.label}"
  card-panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
---

# Design System: MoSim Mod Tracker

## Overview

**Creative North Star: "The Shared Pit Board"**

MoSim Mod Tracker is a speedrun-style timer bolted onto a shared roster board: one person's private LiveSplit for stepping through a FRC robot mod, and everyone's public window into who's building what, so effort never collides. The interface reads like terminal telemetry — dense, dark, monospaced-adjacent, numbers that don't jitter — because the person using it daily is a builder tracking real progress, not a visitor being sold something. But the public-facing surfaces (the community directory, a shared robot card, a `/u/:uid` profile) are held to the same bar a stranger would judge on first click: no rough edges just because "it's just for me."

Density comes first. Tables are tight, pills are compact, panels sit flush against thin borders instead of floating on shadow. Color is functional before it is decorative: the accent green marks primary action and "in progress," pill hues are a status-light vocabulary (purple/orange/gold/green/blue) borrowed from pit-crew indicator lights, not a mood board. Nothing here chases warmth or playfulness; the personality is precision.

The heading scale and elevation are both realized: headings carry a genuinely heavier, larger step (see the Rising Weight Rule below) instead of body-matched sizing, and every theme/mode has a real soft-depth shadow except cloud dark, which deliberately omits it in favor of its own gradient surfaces for separation.

**Key Characteristics:**
- Terminal-precision palette: dark slate base, one green accent, status communicated through hue not decoration
- Pill-shaped status/type indicators everywhere progress or category needs to be scanned at a glance
- Flat, border-defined surfaces today; soft ambient depth is the near-term target
- Every custom form control (Select, PillSelect, Dialog) replaces its native equivalent — no raw `<select>`, no native `confirm()`/`alert()`
- Public and private surfaces share one visual language; there is no "internal tool" downgrade

## Colors

The palette is built from one functional accent plus a fixed status-light vocabulary; nothing is decorative.

### Primary
- **Terminal Green** (`#3fb950`): the one accent. Marks primary buttons, active nav state, "in progress"/"semi-functional" status pills, checked step indicators, and the progress-bar's completion color. Used sparingly — outside status pills and the primary CTA, it rarely appears.

### Secondary
- **Signal Blue** (`#58a6ff`): the second seed color. Used for links, the "released" status pill, and paired with the accent in the progress-bar gradient (gold → accent) and generated custom-theme derivations.

### Tertiary
- **Circuit Gold** (`#d4a72c`): the warning/attention hue. Used for the "in-unity" status pill, the half-checked step-indicator state, and as the leading color in the progress-bar gradient.
- **Alert Red** (`#f85149`): reserved for destructive actions (`.btn.danger`) and the error banner. Never used decoratively.

### Neutral
- **Void** (`#0b0e14`): the app background — near-black slate, not pure black.
- **Panel** (`#141a24`) / **Panel Raised** (`#1a2130`): the two surface layers. Panel is the resting card/table surface; Panel Raised is the recessed/interactive surface (inputs, hover states, the split "done" background before the accent tint applies).
- **Border Solid** (`#263042`): the only structural border color in the system — thin, 1px, never decorative.
- **Text** (`#e6e9ef`) / **Muted** (`#8b95a7`): primary reading color and secondary/label color respectively.
- **Titlebar** (`#0a0d12`): the desktop-app custom titlebar, always slightly darker than the page background.

### Named Rules
**The One Accent Rule.** Terminal Green is the only color used for affirmative action (primary buttons, checked state, active nav). It never doubles as a decorative highlight — if a green element appears, it means "the primary action" or "confirmed progress," full stop.

**The Status-Light Rule.** Purple (planned) → orange (claimed) → gold (in-unity) → green (semi-functional/done) → blue (released) is a fixed, memorized hue sequence for status pills. A new status category must pick an unused hue from this family rather than reusing one.

## Typography

**Body Font:** IBM Plex Sans (variable, weight 100–700), self-hosted, with Segoe UI / system-ui fallback
**Label/Mono Font:** Consolas, Cascadia Code, monospace — used only for raw script/code previews

**Character:** A single grotesk-leaning humanist sans carries every role; hierarchy comes from size and negative tracking, not a font pairing. It reads as a dev tool, not an editorial product.

### Hierarchy
- **Headline** (700 weight, 28px, -0.02em): page titles (`h1`).
- **Section** (700 weight, 20px, -0.015em): section headers (`h2`).
- **Title** (650 weight, 15px, -0.01em): card/subsection headers (`h3`).
- **Body** (400 weight, 14px, -0.003em): all running text and form inputs.
- **Label** (600 weight, 12px): pill text, small buttons, status tags, muted captions (`.small`).
- **Mono** (400 weight, 12.5px): script/code snippet previews only.

Numeric readouts (team numbers, progress percentages, step counts) use `font-variant-numeric: tabular-nums` everywhere so digits don't shift width as they update — non-negotiable for a LiveSplit-style tracker.

### Named Rules
**The Rising Weight Rule.** Headings carry a genuinely heavier, larger step than body text (h1 700/28px, h2 700/20px, h3 650/15px) so the hierarchy reads at a glance instead of by letter-spacing alone. This is the realized state as of the last polish pass — h1/h3 were already bold by the browser's default heading weight, but ran undersized (h1 at 22px, no explicit h2 rule at all); sizes were raised to the target and h2 gained an explicit weight/size so it no longer depended on browser defaults.

**The Tabular Numbers Rule.** Any number that updates in place (team #, %, step counts) gets `font-variant-numeric: tabular-nums`. No exceptions — jitter reads as a bug in a timer-style UI.

## Layout

Pages sit inside a `max-width: 1250px` container with consistent `24px` horizontal padding. The topbar is sticky, single-row, and wraps its nav on narrow viewports rather than collapsing into a hamburger. Tables use `table-layout: fixed` with percentage-based `nth-child` column widths so multi-game tables stay visually aligned regardless of each game's own content length. Spacing follows an approximate 4/8/12/20/24px rhythm — tight by default (12px card padding, 8px gaps) with 20–24px reserved for page-level separation. The desktop build additionally reserves a custom draggable titlebar row above the topbar.

## Elevation & Depth

The system is flat-and-bordered at rest today — thin 1px `border-solid` borders do the structural work, and the dark theme's `--shadow` token is literally `none`. The chosen target, however, is soft depth: panels, cards, and the "add robot" form should pick up a diffuse ambient shadow (already partially present as `--shadow: 0 1px 3px rgba(0,0,0,0.45)` in light/cloud themes) rather than relying on borders alone. Treat the current all-flat dark theme as the gap to close during polish, not the standard to preserve.

### Shadow Vocabulary
- **Ambient Card** (`box-shadow: 0 1px 3px rgba(0,0,0,0.45)` default dark / `0 1px 3px rgba(20,30,50,0.08)` default light / `0 2px 16px rgba(109,40,217,0.1)` cloud light): the existing topbar/add-form/split-card shadow. Present in default (both modes) and cloud light; `--shadow: none` only in cloud dark, which relies on its bespoke gradient surfaces for separation instead.
- **Focus Ring** (`box-shadow: 0 0 0 3px var(--accent-dim)`, plus `outline: 2px solid var(--accent)` for keyboard-only focus): the only "elevation" that's fully consistent across themes today.

### Named Rules
**The Depth-On-Purpose Rule.** Once soft depth is applied, it should mark real surface separation (a card floating over the page background), never a hover-only flourish. Borders remain the primary structural signal; shadow adds weight, it doesn't replace the border.

## Shapes

Two radius steps cover the whole system: `--radius-sm` (9px) for buttons, checkboxes, nav pills, and small controls; `--radius` (12px) for cards, panels, dialogs, and the add-form. Status pills and the progress bar use a full `999px` pill radius. Corners are never sharp (0px) and never heavily rounded (>16px) outside the pill family — the two-step system is deliberately narrow.

## Components

### Buttons
- **Shape:** 9px radius (`--radius-sm`), 1px border.
- **Primary:** solid Terminal Green background, white text, `7px 14px` padding; hover shifts the fill toward blue via `color-mix`.
- **Danger:** transparent background, red text/border; hover adds a faint red wash.
- **Subtle:** fully transparent until hover, then picks up the Panel Raised background — used for back-buttons and icon-only actions.
- **Press feedback:** every pressable (`.btn`, dropdown triggers, tabs, toggles) scales to `0.97` on `:active`, 160ms ease-out — skipped under `prefers-reduced-motion`.

### Chips
Status and mod-type pills (`.pill`) are full-radius, 600-weight, 12.5px label text, `4px 22px 4px 12px` padding (extra right padding reserves room for the dropdown chevron). Each status has its own fixed bg/fg pair from the Status-Light Rule; disabled pills stay at full opacity so read-only status stays legible.

### Cards / Containers
- **Corner Style:** 12px (`--radius`).
- **Background:** Panel (`#141a24`), Panel Raised (`#1a2130`) on hover/interaction.
- **Shadow Strategy:** see Elevation & Depth — soft ambient ✅ in default (both modes) and cloud light; `none` in cloud dark by design (its gradient surfaces carry separation instead).
- **Border:** 1px `border-solid`, tinted toward accent (`color-mix` at 40%) when a card represents a "done" state.
- **Internal Padding:** `12px 14px`.

### Inputs / Fields
- **Style:** Panel Raised background, 1px border, 9px radius, no native `<select>` anywhere — every dropdown is the custom portal-rendered `Select`/`PillSelect` component.
- **Focus:** border shifts to accent + `0 0 0 3px var(--accent-dim)` glow.
- **Read-only:** text inputs stay editable-looking but save on blur rather than per-keystroke, to avoid hammering the store.

### Navigation
Nav links are plain text on transparent background, `6px 12px` padding, 9px radius. Hover picks up Panel Raised background and full-opacity text; the active route gets an accent-tinted background (`--accent-dim`) plus a 1px inset accent ring — visually distinct from hover, not just a repeat of it.

### The Split (signature component)
The core LiveSplit-style accordion step (`.split`): a bordered, 12px-radius card per workflow step, whose header background shifts to `--accent-dim` once every sub-step is checked, and whose border tints toward accent at 40%. Each sub-step check is a 22×22px square (`--radius-sm`) that fills solid green when checked, or gold-outlined for a half-checked step-group — this three-state check control is the single most distinctive visual element in the app and should be preserved exactly in any redesign.

## Do's and Don'ts

### Do:
- **Do** use `font-variant-numeric: tabular-nums` on every numeric readout that updates in place (team #, progress %, step counts).
- **Do** route every confirm/alert through the `Dialog` component (`confirmDialog`/`alertDialog`) — never a native `confirm()`/`alert()`.
- **Do** respect `prefers-reduced-motion` by killing transform-based entrance/press animation while keeping color/opacity feedback.
- **Do** hold public-facing surfaces (community directory, `/u/:uid`, `/robot/:id` embeds) to the same visual bar as the private app — there is no "internal tool" exemption.

### Don't:
- **Don't** add a raw native `<select>` anywhere — always the portal-rendered `Select`/`PillSelect` component.
- **Don't** introduce a new accent color for "primary action" — Terminal Green is the only affirmative-action color in the system.
- **Don't** invent a new status hue outside the fixed purple → orange → gold → green → blue sequence without updating the Status-Light Rule deliberately.
