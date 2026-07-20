// ---------------------------------------------------------------------------
// Small color utilities + theme generation. Given a primary (accent) and a
// secondary color, generateTheme() derives a full, cohesive set of CSS-variable
// values so the theme editor only needs those two inputs plus a dark/light base.
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** RGB (0-255) -> HSL with h in [0,360], s/l in [0,100]. */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

/** HSL (h 0-360, s/l 0-100) -> RGB (0-255). */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const hsl = (h: number, s: number, l: number) => rgbToHex(...hslToRgb(h, s, l));

function hueDelta(a: number, b: number): number {
  return ((((b - a) % 360) + 540) % 360) - 180;
}

function hueDist(a: number, b: number): number {
  return Math.abs(hueDelta(a, b));
}

function mixHue(a: number, b: number, t: number): number {
  return a + hueDelta(a, b) * clamp(t, 0, 1);
}

/** '#rrggbbaa' from a hex color + alpha (0-1). */
export function withAlpha(hex: string, alpha: number): string {
  const a = clamp(Math.round(alpha * 255), 0, 255).toString(16).padStart(2, '0');
  return rgbToHex(...hexToRgb(hex)) + a;
}

export function hueOf(hex: string): number {
  return rgbToHsl(...hexToRgb(hex))[0];
}

/**
 * Build a full theme from two colors. `primary` and `secondary` are the direct
 * user inputs; additional accents (`gold`, `red`) are auto-derived from that pair.
 * `mode` picks a dark or light neutral ramp.
 */
export function generateTheme(
  primary: string,
  secondary: string,
  mode: 'dark' | 'light'
): Record<string, string> {
  const dark = mode === 'dark';
  const [phRaw, psRaw, plRaw] = rgbToHsl(...hexToRgb(primary));
  const [shRaw, ssRaw, slRaw] = rgbToHsl(...hexToRgb(secondary));

  // Keep both accents visible enough for UI controls.
  const pSat = clamp(psRaw, 45, 90);
  const pLight = clamp(plRaw, dark ? 50 : 36, dark ? 72 : 56);
  const sSat = clamp(ssRaw, 32, 86);
  const sLight = clamp(slRaw, dark ? 50 : 34, dark ? 72 : 56);

  const primarySafe = hsl(phRaw, pSat, pLight);
  const secondarySafe = hsl(shRaw, sSat, sLight);

  // Neutrals and extra accents are derived from the primary+secondary pair.
  const pairHue = mixHue(phRaw, shRaw, 0.5);
  const pairDist = hueDist(phRaw, shRaw);
  const neutralHue = mixHue(pairHue, phRaw, 0.32);
  const neutralSatBase = dark ? 8 + pSat * 0.1 + sSat * 0.07 : 6 + pSat * 0.07 + sSat * 0.05;
  const nSat = clamp(neutralSatBase * (pairDist > 130 ? 1.06 : 0.96), 6, 20);

  // "Third" and "fourth" accents: keep semantic warm/error roles while fitting
  // the chosen palette by blending toward amber/red targets from the pair hue.
  const goldHue = mixHue(42, pairHue, 0.35);
  const redHue = mixHue(4, pairHue, 0.28);
  const gold = dark ? hsl(goldHue, 62, 58) : hsl(goldHue, 58, 42);
  const red = dark ? hsl(redHue, 76, 64) : hsl(redHue, 70, 48);

  // Status pill hues are fixed & semantic; only their lightness/alpha flex.
  const pill = (h: number, s = 70) =>
    dark
      ? { bg: withAlpha(hsl(h, s, 55), 0.16), fg: hsl(h, Math.min(s, 65), 72) }
      : { bg: hsl(h, s, 92), fg: hsl(h, Math.min(s, 65), 32) };
  const planned = pill(265), claimed = pill(28), unity = pill(45),
        semi = pill(140), released = pill(215), gray = pill(neutralHue, 12),
        official = pill(20);

  const neutrals = dark
    ? { bg: 9, titlebar: 6, panel: 14, panel2: 19, border: 27, muted: 60, text: 92 }
    : { bg: 96, titlebar: 90, panel: 100, panel2: 93, border: 84, muted: 44, text: 17 };

  return {
    bg: hsl(neutralHue, nSat, neutrals.bg),
    'bg-image': 'none',
    panel: hsl(neutralHue, dark ? nSat : nSat * 0.5, neutrals.panel),
    'panel-2': hsl(neutralHue, nSat, neutrals.panel2),
    'border-solid': hsl(neutralHue, nSat, neutrals.border),
    text: hsl(neutralHue, dark ? 14 : 22, neutrals.text),
    muted: hsl(neutralHue, 12, neutrals.muted),
    titlebar: hsl(mixHue(neutralHue, phRaw, 0.35), clamp(nSat + (dark ? 8 : 6), 10, 28), neutrals.titlebar),
    accent: primarySafe,
    'accent-dim': withAlpha(primarySafe, dark ? 0.24 : 0.18),
    blue: secondarySafe,
    gold,
    red,
    shadow: dark ? 'none' : '0 1px 3px rgba(20, 30, 50, 0.08)',
    radius: '12px',
    'pill-planned-bg': planned.bg, 'pill-planned-fg': planned.fg,
    'pill-claimed-bg': claimed.bg, 'pill-claimed-fg': claimed.fg,
    'pill-unity-bg': unity.bg, 'pill-unity-fg': unity.fg,
    'pill-semi-bg': semi.bg, 'pill-semi-fg': semi.fg,
    'pill-released-bg': released.bg, 'pill-released-fg': released.fg,
    'pill-gray-bg': gray.bg, 'pill-gray-fg': gray.fg,
    'pill-official-bg': official.bg, 'pill-official-fg': official.fg,
  };
}
