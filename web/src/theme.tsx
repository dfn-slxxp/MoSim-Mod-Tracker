// ---------------------------------------------------------------------------
// Theme switching. Each theme is a set of CSS variables defined in styles.css
// under `[data-theme='...']`. Switching = changing one attribute on <html>;
// the browser restyles everything instantly. Choice persists in localStorage.
// ---------------------------------------------------------------------------
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'cloud';

export const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'cloud', label: 'Cloud', icon: '☁️' }
];

const KEY = 'mosim-theme';

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: 'dark',
  setTheme: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'cloud' ? saved : 'dark';
  });

  // Whenever `theme` changes, stamp it on <html> and remember it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
