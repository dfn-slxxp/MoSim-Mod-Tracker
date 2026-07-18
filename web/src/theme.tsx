// ---------------------------------------------------------------------------
// Theme switching. Built-in themes are CSS variable sets in styles.css under
// `[data-theme='...']`. Custom themes are created in the admin dashboard,
// stored on the server (GET /api/themes), and injected at runtime as a
// <style> tag so they behave exactly like the built-ins on every device.
// ---------------------------------------------------------------------------
import React, { createContext, useContext, useEffect, useState } from 'react';
import { isTauri, getServerUrl } from './lib/desktop';
import type { CustomTheme } from './types';

export type Theme = string; // builtin id ('dark'|'light'|'cloud') or a custom theme id

export const BUILTIN_THEMES: { id: string; label: string; icon: string }[] = [
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'cloud', label: 'Cloud', icon: '☁️' }
];

const KEY = 'mosim-theme';
const STYLE_TAG_ID = 'mosim-custom-themes';

/** Compile the custom theme list into CSS and inject/replace the style tag. */
export function injectCustomThemes(themes: CustomTheme[]): void {
  const css = themes
    .map((t) => {
      const vars = Object.entries(t.vars)
        .map(([k, v]) => `  --${k}: ${v};`)
        .join('\n');
      return `:root[data-theme='${t.id}'] {\n${vars}\n}`;
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
  /** Built-ins + custom, in cycle order for the topbar button. */
  allThemes: { id: string; label: string; icon: string }[];
  customThemes: CustomTheme[];
  /** Called by the admin dashboard after saving to refresh without reload. */
  setCustomThemes: (t: CustomTheme[]) => void;
}

const ThemeContext = createContext<ThemeValue>({
  theme: 'dark',
  setTheme: () => {},
  allThemes: BUILTIN_THEMES,
  customThemes: [],
  setCustomThemes: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem(KEY) ?? 'dark');
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

  // Whenever `theme` changes, stamp it on <html> and remember it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
  }, [theme]);

  // If the saved theme was a custom one that no longer exists, fall back.
  useEffect(() => {
    const known = [...BUILTIN_THEMES.map((t) => t.id), ...customThemes.map((t) => t.id)];
    if (customThemes.length > 0 && !known.includes(theme)) setTheme('dark');
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
    <ThemeContext.Provider value={{ theme, setTheme, allThemes, customThemes, setCustomThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
