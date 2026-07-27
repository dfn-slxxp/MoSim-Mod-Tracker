// ---------------------------------------------------------------------------
// Theme switching. Built-in palettes are CSS variable sets in styles.css under
// `[data-theme='...']`. Color mode (dark/light) is a separate `data-color-mode`
// attribute so palette and brightness are independent. Custom themes are created
// in the admin dashboard, stored on the server (GET /api/themes), and injected at
// runtime as a <style> tag with dark + light variants.
// ---------------------------------------------------------------------------
import React, { createContext, useContext, useEffect, useState } from 'react';
import { generateTheme } from './lib/color';
import { isTauri, getServerUrl } from './lib/desktop';
import type { CustomTheme } from './types';

export type Theme = string; // 'default' | 'cloud' | custom-* id
export type ColorMode = 'dark' | 'light';

export const BUILTIN_THEMES: { id: string; label: string; icon: string }[] = [
  { id: 'default', label: 'Default', icon: '◆' },
  { id: 'cloud', label: 'Cloud', icon: '☁️' }
];

const THEME_KEY = 'mosim-theme';
const COLOR_MODE_KEY = 'mosim-color-mode';
const STYLE_TAG_ID = 'mosim-custom-themes';

const DEFAULT_CUSTOM_COLORS = { primary: '#3fb950', secondary: '#58a6ff' };

/** Migrate legacy saves where dark/light were theme ids. */
function loadSavedTheme(): Theme {
  const raw = localStorage.getItem(THEME_KEY) ?? 'default';
  if (raw === 'dark' || raw === 'light') return 'default';
  return raw;
}

function loadSavedColorMode(): ColorMode {
  const rawTheme = localStorage.getItem(THEME_KEY);
  if (rawTheme === 'light') return 'light';
  if (rawTheme === 'dark') return 'dark';
  return localStorage.getItem(COLOR_MODE_KEY) === 'light' ? 'light' : 'dark';
}

/** Compile custom themes into CSS (both color modes) and inject/replace the style tag. */
export function injectCustomThemes(themes: CustomTheme[]): void {
  const css = themes
    .flatMap((t) => {
      const primary = t.primary ?? DEFAULT_CUSTOM_COLORS.primary;
      const secondary = t.secondary ?? DEFAULT_CUSTOM_COLORS.secondary;
      return (['dark', 'light'] as const).map((mode) => {
        const vars =
          t.mode === mode && t.vars && Object.keys(t.vars).length > 0
            ? t.vars
            : generateTheme(primary, secondary, mode);
        const lines = Object.entries(vars)
          .map(([k, v]) => `  --${k}: ${v};`)
          .join('\n');
        return `:root[data-theme='${t.id}'][data-color-mode='${mode}'] {\n${lines}\n}`;
      });
    })
    .join('\n\n');
  let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_TAG_ID;
    document.head.appendChild(tag);
  }
  tag.textContent = css;
}

/** Color CSS variables accepted on import of a bare/legacy palette map. */
const EXPORT_VARS = [
  'bg', 'panel', 'panel-2', 'border-solid', 'text', 'muted', 'titlebar',
  'accent', 'accent-contrast', 'accent-dim', 'blue', 'gold', 'red',
  'pill-planned-bg', 'pill-planned-fg',
  'pill-claimed-bg', 'pill-claimed-fg',
  'pill-unity-bg', 'pill-unity-fg',
  'pill-semi-bg', 'pill-semi-fg',
  'pill-released-bg', 'pill-released-fg',
  'pill-gray-bg', 'pill-gray-fg',
  'pill-official-bg', 'pill-official-fg',
];

/**
 * Export the theme as a one-element array of `{ name, primary, secondary }` — the
 * theme's label plus the two seed colors the user set. For a custom theme the seeds are
 * stored verbatim; for a built-in (or a legacy import with no seed pair) we fall back to
 * the live accent + blue. The full palette is derived from the pair via generateTheme()
 * on re-import, so a round-trip reproduces the theme in both modes. The array shape lets
 * several themes be pasted at once on import.
 */
export function exportThemeColors(
  theme: Theme,
  customThemes: CustomTheme[] = [],
  allThemes: { id: string; label: string }[] = []
): Array<{ name: string; primary: string; secondary: string }> {
  const name = allThemes.find((t) => t.id === theme)?.label ?? theme;
  const custom = customThemes.find((t) => t.id === theme);
  let primary: string;
  let secondary: string;
  if (custom?.primary && custom?.secondary) {
    primary = custom.primary;
    secondary = custom.secondary;
  } else {
    const cs = getComputedStyle(document.documentElement);
    primary = cs.getPropertyValue('--accent').trim();
    secondary = cs.getPropertyValue('--blue').trim();
  }
  return [{ name, primary, secondary }];
}

// ── Importing a pasted palette ────────────────────────────────────────────────

/** A user-pasted palette, applied as a live theme. */
export interface ImportedTheme {
  id: string;
  label: string;
  icon: string;
  /** Seed pair — when present, both dark + light are generated (like a custom theme). */
  primary?: string;
  secondary?: string;
  /** Legacy/bare raw CSS-var map, mode-agnostic. Used only when there's no seed pair. */
  colors?: Record<string, string>;
}

const IMPORTED_KEY = 'mosim-imported-themes';
const IMPORTED_STYLE_TAG_ID = 'mosim-imported-themes-style';
// Keys accepted on import (the 27 exported colors + a few optional extras).
const IMPORT_ALLOWED = new Set([...EXPORT_VARS, 'bg-image', 'shadow', 'radius', 'radius-sm']);

const isHexColor = (s: unknown): s is string =>
  typeof s === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s.trim());

/** One parsed theme: either a seed pair or a legacy raw color map. */
export interface ParsedTheme {
  label: string;
  primary?: string;
  secondary?: string;
  colors?: Record<string, string>;
}

/** Parse a single theme object; returns null if it holds no recognizable colors. */
function parseOneTheme(obj: Record<string, unknown>): ParsedTheme | null {
  const label =
    typeof obj.name === 'string' && obj.name.trim()
      ? obj.name.trim()
      : typeof obj.theme === 'string' && obj.theme.trim()
        ? obj.theme.trim()
        : 'Imported';

  // Seed-pair form — what "Copy colors as JSON" produces.
  if (isHexColor(obj.primary) && isHexColor(obj.secondary)) {
    return { label, primary: obj.primary.trim(), secondary: obj.secondary.trim() };
  }

  // Bare / legacy CSS-var map.
  const rawColors =
    obj.colors && typeof obj.colors === 'object' ? (obj.colors as Record<string, unknown>) : obj;
  const colors: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawColors)) {
    const key = k.replace(/^--/, '');
    if (!IMPORT_ALLOWED.has(key) || typeof v !== 'string') continue;
    const val = v.trim();
    if (!val || /[{}<>;]/.test(val)) continue; // no declaration break-out
    colors[key] = val;
  }
  if (!colors.bg && !colors.accent) return null;
  return { label, colors };
}

/**
 * Parse a pasted palette into one or more themes. Preferred shape is the exported
 * array `[{ name, primary, secondary }]` (the full palette is regenerated from each
 * pair). Also accepts a single seed-pair object `{ name?, primary, secondary }` and a
 * bare `{ bg, accent, ... }` CSS-var map for backwards compatibility. Unknown keys are
 * dropped and values that could break out of a CSS declaration are rejected. Throws a
 * friendly Error on anything unusable.
 */
export function parseThemeImport(text: string): ParsedTheme[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That is not valid JSON.');
  }

  if (Array.isArray(data)) {
    const out: ParsedTheme[] = [];
    for (const item of data) {
      if (item && typeof item === 'object') {
        const p = parseOneTheme(item as Record<string, unknown>);
        if (p) out.push(p);
      }
    }
    if (!out.length) throw new Error('No recognizable themes found in that array.');
    return out;
  }

  if (!data || typeof data !== 'object') throw new Error('Expected a JSON array or object.');
  const p = parseOneTheme(data as Record<string, unknown>);
  if (!p) {
    throw new Error('No recognizable theme colors found (need "primary" + "secondary", or at least "bg"/"accent").');
  }
  return [p];
}

function loadImportedThemes(): ImportedTheme[] {
  try {
    const raw = localStorage.getItem(IMPORTED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter(
          (t) =>
            t &&
            typeof t.id === 'string' &&
            ((t.colors && typeof t.colors === 'object') ||
              (typeof t.primary === 'string' && typeof t.secondary === 'string'))
        )
      : [];
  } catch {
    return [];
  }
}

/**
 * Inject imported palettes as `<style>` blocks. A seed pair generates both color modes
 * (like a custom theme); a legacy raw map is emitted mode-agnostically with the default
 * gradient killed so it doesn't bleed through.
 */
export function injectImportedThemes(themes: ImportedTheme[]): void {
  const css = themes
    .flatMap((t) => {
      if (t.primary && t.secondary) {
        const primary = t.primary;
        const secondary = t.secondary;
        return (['dark', 'light'] as const).map((mode) => {
          const vars = generateTheme(primary, secondary, mode);
          const lines = Object.entries(vars)
            .map(([k, v]) => `  --${k}: ${v};`)
            .join('\n');
          return `:root[data-theme='${t.id}'][data-color-mode='${mode}'] {\n${lines}\n}`;
        });
      }
      const entries = { ...(t.colors ?? {}) };
      if (!('bg-image' in entries)) entries['bg-image'] = 'none'; // don't inherit the default gradient
      const lines = Object.entries(entries)
        .map(([k, v]) => `  --${k}: ${v};`)
        .join('\n');
      return [`:root[data-theme='${t.id}'] {\n${lines}\n}`];
    })
    .join('\n\n');
  let tag = document.getElementById(IMPORTED_STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = IMPORTED_STYLE_TAG_ID;
    document.head.appendChild(tag);
  }
  tag.textContent = css;
}

function slugId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'theme';
}

interface ThemeValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  colorMode: ColorMode;
  setColorMode: (m: ColorMode) => void;
  toggleColorMode: () => void;
  /** Built-ins + custom + imported, in cycle order for the topbar button. */
  allThemes: { id: string; label: string; icon: string }[];
  customThemes: CustomTheme[];
  /** Called by the admin dashboard after saving to refresh without reload. */
  setCustomThemes: (t: CustomTheme[]) => void;
  /** Locally-imported (pasted) palettes, stored in localStorage on this device. */
  importedThemes: ImportedTheme[];
  /** Parse + store one or more pasted palettes and return them (throws on invalid input). */
  importTheme: (text: string) => ImportedTheme[];
  removeImportedTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeValue>({
  theme: 'default',
  setTheme: () => {},
  colorMode: 'dark',
  setColorMode: () => {},
  toggleColorMode: () => {},
  allThemes: BUILTIN_THEMES,
  customThemes: [],
  setCustomThemes: () => {},
  importedThemes: [],
  importTheme: () => { throw new Error('Theme provider not ready'); },
  // ^ never returns (throws); satisfies the ImportedTheme[] signature.
  removeImportedTheme: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadSavedTheme);
  const [colorMode, setColorMode] = useState<ColorMode>(loadSavedColorMode);
  const [customThemes, setCustomThemesState] = useState<CustomTheme[]>([]);
  const [importedThemes, setImportedThemes] = useState<ImportedTheme[]>(loadImportedThemes);

  // Inject locally-imported palettes on mount so a saved import survives reload.
  useEffect(() => {
    if (importedThemes.length) injectImportedThemes(importedThemes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load custom themes from the server once on mount.
  useEffect(() => {
    (async () => {
      try {
        const base = isTauri() ? await getServerUrl() : '';
        const res = await fetch(`${base}/api/themes`);
        if (!res.ok) return;
        const body = (await res.json()) as { themes: CustomTheme[] };
        if (Array.isArray(body.themes)) {
          injectCustomThemes(body.themes);
          setCustomThemesState(body.themes);
        }
      } catch {
        // Offline: built-ins still work.
      }
    })();
  }, []);

  // Stamp palette + color mode on <html> and remember them.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.colorMode = colorMode;
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(COLOR_MODE_KEY, colorMode);
  }, [theme, colorMode]);

  // If the saved theme was a custom one that no longer exists, fall back.
  useEffect(() => {
    const known = [
      ...BUILTIN_THEMES.map((t) => t.id),
      ...customThemes.map((t) => t.id),
      ...importedThemes.map((t) => t.id),
    ];
    if (customThemes.length > 0 && !known.includes(theme)) setTheme('default');
  }, [customThemes, importedThemes, theme]);

  const setCustomThemes = (themes: CustomTheme[]) => {
    injectCustomThemes(themes);
    setCustomThemesState(themes);
  };

  const persistImported = (next: ImportedTheme[]) => {
    injectImportedThemes(next);
    setImportedThemes(next);
    try {
      localStorage.setItem(IMPORTED_KEY, JSON.stringify(next));
    } catch {
      /* storage full / blocked — theme still applies for this session */
    }
  };

  const importTheme = (text: string): ImportedTheme[] => {
    const parsed = parseThemeImport(text);
    const taken = new Set([
      ...BUILTIN_THEMES.map((t) => t.id),
      ...customThemes.map((t) => t.id),
      ...importedThemes.map((t) => t.id),
    ]);
    const created: ImportedTheme[] = [];
    for (const p of parsed) {
      let id = `imported-${slugId(p.label)}`;
      let n = 2;
      while (taken.has(id)) id = `imported-${slugId(p.label)}-${n++}`;
      taken.add(id);
      created.push(
        p.primary && p.secondary
          ? { id, label: p.label, icon: '📥', primary: p.primary, secondary: p.secondary }
          : { id, label: p.label, icon: '📥', colors: p.colors }
      );
    }
    persistImported([...importedThemes, ...created]);
    return created;
  };

  const removeImportedTheme = (id: string) => {
    persistImported(importedThemes.filter((t) => t.id !== id));
    if (theme === id) setTheme('default');
  };

  const allThemes = [
    ...BUILTIN_THEMES,
    ...customThemes.map((t) => ({ id: t.id, label: t.label, icon: t.icon || '🎨' })),
    ...importedThemes.map((t) => ({ id: t.id, label: t.label, icon: t.icon || '📥' }))
  ];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        colorMode,
        setColorMode,
        toggleColorMode: () => setColorMode((m) => (m === 'dark' ? 'light' : 'dark')),
        allThemes,
        customThemes,
        setCustomThemes,
        importedThemes,
        importTheme,
        removeImportedTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
