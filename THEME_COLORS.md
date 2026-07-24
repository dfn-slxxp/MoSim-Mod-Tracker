# MoSim Mod Tracker — Theme Color Palette

A portable spec for the color system used by MoSim Mod Tracker, so another site
(or another AI session) can reuse the exact palette. Paste this whole file into a
new session and say "apply these colors to my site."

The app exposes a **"Copy colors as JSON"** action (right-click the theme button)
that copies the *currently active* theme + brightness as an object shaped like:

```json
{
  "theme": "default",
  "mode": "dark",
  "colors": { "bg": "#0b0e14", "accent": "#3fb950", ... }
}
```

`theme` is the palette id, `mode` is `"dark"` or `"light"`, and `colors` holds the
27 tokens below. Everything in `colors` is a CSS color string. Some values use
**8-digit hex** (`#rrggbbaa`) — the last two hex digits are alpha (e.g. `26` ≈ 15%
opacity). Any target that understands CSS colors can consume them as-is.

---

## How to apply

Map each token to a CSS custom property named `--<token>` and let the rest of your
CSS reference them. This mirrors exactly how the app consumes them:

```css
:root {
  --bg: #0b0e14;
  --panel: #141a24;
  --text: #e6e9ef;
  --accent: #3fb950;
  /* ...all 27 tokens... */
}

body        { background: var(--bg); color: var(--text); }
.card       { background: var(--panel); border: 1px solid var(--border-solid); }
.button     { background: var(--accent); color: var(--accent-contrast); }
.link       { color: var(--blue); }
.muted-text { color: var(--muted); }
```

For dark/light support, define both sets and switch with a `data-color-mode`
attribute (or a `prefers-color-scheme` media query):

```css
:root[data-color-mode='dark']  { --bg: #0b0e14; /* dark values */ }
:root[data-color-mode='light'] { --bg: #f4f6f9; /* light values */ }
```

---

## Token reference

| Token | Role |
|---|---|
| `bg` | Page background |
| `panel` | Card / surface background (raised above `bg`) |
| `panel-2` | Secondary surface (insets, hover rows, nested panels) |
| `border-solid` | Borders and dividers |
| `text` | Primary text |
| `muted` | Secondary / de-emphasized text |
| `titlebar` | App title bar / top strip background |
| `accent` | Primary brand color (primary buttons, active states) |
| `accent-contrast` | Text/icon color that sits **on** `accent` (readable foreground) |
| `accent-dim` | Low-alpha accent wash (active nav, subtle highlights) |
| `blue` | Secondary accent / links / info |
| `gold` | Warm accent (warnings, highlights) |
| `red` | Error / destructive |
| `pill-planned-bg` / `pill-planned-fg` | Status pill: "planned" (bg + text) |
| `pill-claimed-bg` / `pill-claimed-fg` | Status pill: "claimed" |
| `pill-unity-bg` / `pill-unity-fg` | Status pill: "in Unity" |
| `pill-semi-bg` / `pill-semi-fg` | Status pill: "semi-functional" |
| `pill-released-bg` / `pill-released-fg` | Status pill: "released" |
| `pill-gray-bg` / `pill-gray-fg` | Neutral / default pill |
| `pill-official-bg` / `pill-official-fg` | "official" tag |

The `pill-*` pairs are chip styles: `-bg` is the chip background (usually a
low-alpha tint), `-fg` is its text color. If your site has no status chips, you
can ignore them and just use the core tokens (`bg` through `red`).

---

## Reference values — "default" theme

### Dark (`mode: "dark"`)

```json
{
  "theme": "default",
  "mode": "dark",
  "colors": {
    "bg": "#0b0e14",
    "panel": "#141a24",
    "panel-2": "#1a2130",
    "border-solid": "#263042",
    "text": "#e6e9ef",
    "muted": "#8b95a7",
    "titlebar": "#0a0d12",
    "accent": "#3fb950",
    "accent-contrast": "#ffffff",
    "accent-dim": "#2ea04326",
    "blue": "#58a6ff",
    "gold": "#d4a72c",
    "red": "#f85149",
    "pill-planned-bg": "#6e40c926",
    "pill-planned-fg": "#c297ff",
    "pill-claimed-bg": "#f0883e26",
    "pill-claimed-fg": "#ffab70",
    "pill-unity-bg": "#d4a72c26",
    "pill-unity-fg": "#e3c04c",
    "pill-semi-bg": "#3fb95026",
    "pill-semi-fg": "#56d364",
    "pill-released-bg": "#58a6ff26",
    "pill-released-fg": "#79b8ff",
    "pill-gray-bg": "#8b95a726",
    "pill-gray-fg": "#a5aebe",
    "pill-official-bg": "#db6d2826",
    "pill-official-fg": "#f0883e"
  }
}
```

### Light (`mode: "light"`)

```json
{
  "theme": "default",
  "mode": "light",
  "colors": {
    "bg": "#f4f6f9",
    "panel": "#ffffff",
    "panel-2": "#eef1f5",
    "border-solid": "#d5dce6",
    "text": "#1c2430",
    "muted": "#66707f",
    "titlebar": "#e6eaf0",
    "accent": "#218739",
    "accent-contrast": "#ffffff",
    "accent-dim": "#21873916",
    "blue": "#2f6fd0",
    "gold": "#b58a17",
    "red": "#d1332e",
    "pill-planned-bg": "#efe3ff",
    "pill-planned-fg": "#6b3fbf",
    "pill-claimed-bg": "#ffe0c7",
    "pill-claimed-fg": "#ad5a1c",
    "pill-unity-bg": "#fff3c2",
    "pill-unity-fg": "#8f6e00",
    "pill-semi-bg": "#d8f3dc",
    "pill-semi-fg": "#1e7a34",
    "pill-released-bg": "#dbe9ff",
    "pill-released-fg": "#2b5faf",
    "pill-gray-bg": "#e7eaef",
    "pill-gray-fg": "#5a6472",
    "pill-official-bg": "#ffe3d1",
    "pill-official-fg": "#b05316"
  }
}
```

---

## Notes

- **8-digit hex is alpha.** `#2ea04326` = `#2ea043` at ~15% opacity. If a tool
  can't take 8-digit hex, convert to `rgba()` (last byte ÷ 255 = alpha).
- **`accent-contrast` matters.** Always pair it with `accent` for button text so
  the label stays legible whether the accent is light or dark.
- **Not colors (excluded on purpose):** the app also has a background gradient
  (`bg-image`), a `shadow`, and corner radii (`radius`) — those aren't part of
  this export because they aren't flat colors. Add your own if needed.
- **Any theme works.** Switch the app's theme/brightness first, then copy — the
  export always reflects what's currently on screen, including custom themes.
