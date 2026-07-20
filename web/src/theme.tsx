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

interface ThemeValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  colorMode: ColorMode;
  setColorMode: (m: ColorMode) => void;
  toggleColorMode: () => void;
  /** Built-ins + custom, in cycle order for the topbar button. */
  allThemes: { id: string; label: string; icon: string }[];
  customThemes: CustomTheme[];
  /** Called by the admin dashboard after saving to refresh without reload. */
  setCustomThemes: (t: CustomTheme[]) => void;
}

const ThemeContext = createContext<ThemeValue>({
  theme: 'default',
  setTheme: () => {},
  colorMode: 'dark',
  setColorMode: () => {},
  toggleColorMode: () => {},
  allThemes: BUILTIN_THEMES,
  customThemes: [],
  setCustomThemes: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadSavedTheme);
  const [colorMode, setColorMode] = useState<ColorMode>(loadSavedColorMode);
  const [customThemes, setCustomThemesState] = useState<CustomTheme[]>([]);

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
    const known = [...BUILTIN_THEMES.map((t) => t.id), ...customThemes.map((t) => t.id)];
    if (customThemes.length > 0 && !known.includes(theme)) setTheme('default');
  }, [customThemes, theme]);

  const setCustomThemes = (themes: CustomTheme[]) => {
    injectCustomThemes(themes);
    setCustomThemesState(themes);
  };

  const allThemes = [
    ...BUILTIN_THEMES,
    ...customThemes.map((t) => ({ id: t.id, label: t.label, icon: t.icon || '🎨' }))
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
        setCustomThemes
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
