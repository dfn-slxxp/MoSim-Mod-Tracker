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

/** Color CSS variables to include when exporting the active theme (skips gradients/radii). */
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
 * Read the colors currently rendering (whichever theme + brightness is active) straight
 * from computed styles, so it works for built-in and custom themes alike. Returns a
 * portable object you can drop into another project / design tool.
 */
export function exportThemeColors(theme: Theme, mode: ColorMode): {
  theme: Theme; mode: ColorMode; colors: Record<string, string>;
} {
  const cs = getComputedStyle(document.documentElement);
  const colors: Record<string, string> = {};
  for (const key of EXPORT_VARS) {
    const v = cs.getPropertyValue(`--${key}`).trim();
    if (v) colors[key] = v;
  }
  return { theme, mode, colors };
}

// ── Importing a pasted palette ────────────────────────────────────────────────

/** A user-pasted palette, applied as a live theme. Mode-agnostic (fixed colors). */
export interface ImportedTheme {
  id: string;
  label: string;
  icon: string;
  colors: Record<string, string>;
}

const IMPORTED_KEY = 'mosim-imported-themes';
const IMPORTED_STYLE_TAG_ID = 'mosim-imported-themes-style';
// Keys accepted on import (the 27 exported colors + a few optional extras).
const IMPORT_ALLOWED = new Set([...EXPORT_VARS, 'bg-image', 'shadow', 'radius', 'radius-sm']);

/**
 * Parse a pasted palette. Accepts either the exported `{theme, mode, colors}` shape or a
 * bare `{ bg, accent, ... }` map. Unknown keys are dropped; values that could break out of
 * a CSS declaration are rejected. Throws a friendly Error on anything unusable.
 */
export function parseThemeImport(text: string): { label: string; colors: Record<string, string> } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That is not valid JSON.');
  }
  if (!data || typeof data !== 'object') throw new Error('Expected a JSON object.');
  const obj = data as Record<string, unknown>;
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
  if (!colors.bg && !colors.accent) {
    throw new Error('No recognizable theme colors found (need at least "bg" or "accent").');
  }
  const label = typeof obj.theme === 'string' && obj.theme.trim() ? obj.theme.trim() : 'Imported';
  return { label, colors };
}

function loadImportedThemes(): ImportedTheme[] {
  try {
    const raw = localStorage.getItem(IMPORTED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter((t) => t && typeof t.id === 'string' && t.colors && typeof t.colors === 'object')
      : [];
  } catch {
    return [];
  }
}

/** Inject imported palettes as `<style>` blocks (mode-agnostic; kills the default gradient). */
export function injectImportedThemes(themes: ImportedTheme[]): void {
  const css = themes
    .map((t) => {
      const entries = { ...t.colors };
      if (!('bg-image' in entries)) entries['bg-image'] = 'none'; // don't inherit the default gradient
      const lines = Object.entries(entries)
        .map(([k, v]) => `  --${k}: ${v};`)
        .join('\n');
      return `:root[data-theme='${t.id}'] {\n${lines}\n}`;
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
  /** Parse + store a pasted palette and return it (throws on invalid input). */
  importTheme: (text: string) => ImportedTheme;
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

  const importTheme = (text: string): ImportedTheme => {
    const { label, colors } = parseThemeImport(text);
    const taken = new Set([
      ...BUILTIN_THEMES.map((t) => t.id),
      ...customThemes.map((t) => t.id),
      ...importedThemes.map((t) => t.id),
    ]);
    let id = `imported-${slugId(label)}`;
    let n = 2;
    while (taken.has(id)) id = `imported-${slugId(label)}-${n++}`;
    const t: ImportedTheme = { id, label, icon: '📥', colors };
    persistImported([...importedThemes, t]);
    return t;
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
