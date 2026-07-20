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

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

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

/** How much a pick should influence surface hue (ignores light, near-neutral colors). */
function tintWeight(s: number, l: number): number {
  if (s < 14) return 0;
  if (l > 88 && s < 35) return s / 200;
  return s / 100;
}

/** Cloud-style layered background from the chosen pair. */
function buildBgImage(
  dark: boolean,
  primary: string,
  secondary: string,
  tintHue: number,
  secondaryHue: number,
  surfaceSat: number
): string {
  const secA = dark ? 0.22 : 0.45;
  const priA = dark ? 0.18 : 0.42;
  const midA = dark ? 0.08 : 0.14;
  const layers = [
    `radial-gradient(ellipse at 10% 92%, ${withAlpha(secondary, secA)} 0%, transparent 44%)`,
    `radial-gradient(ellipse at 90% 8%, ${withAlpha(primary, priA)} 0%, transparent 44%)`,
    `radial-gradient(ellipse at 55% 50%, ${withAlpha(secondary, midA)} 0%, transparent 55%)`,
  ];
  if (!dark) {
    layers.push(
      `linear-gradient(150deg, ${hsl(tintHue, clamp(surfaceSat * 0.85, 28, 68), 97)} 0%, ${hsl(mixHue(tintHue, secondaryHue, 0.35), clamp(surfaceSat * 0.65, 22, 55), 96)} 100%)`
    );
  }
  return layers.join(',\n    ');
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
  const primaryInput = rgbToHex(...hexToRgb(primary));
  const secondaryInput = rgbToHex(...hexToRgb(secondary));
  const [phRaw, psRaw, plRaw] = rgbToHsl(...hexToRgb(primaryInput));
  const [shRaw, ssRaw, slRaw] = rgbToHsl(...hexToRgb(secondaryInput));

  // Keep primary/secondary as the literal inputs. Derived colors adapt to them.
  const accentContrast = relativeLuminance(primaryInput) > 0.38 ? '#111827' : '#ffffff';

  const pTint = tintWeight(psRaw, plRaw);
  const sTint = tintWeight(ssRaw, slRaw);
  const tintTotal = pTint + sTint || 1;
  const pairHue = mixHue(phRaw, shRaw, 0.5);
  const pairDist = hueDist(phRaw, shRaw);
  const maxChroma = Math.max(psRaw * (pTint > 0 ? 1 : 0), ssRaw * (sTint > 0 ? 1 : 0), 24);

  // Surfaces follow saturated inputs; light off-whites/creams defer to the vivid color.
  const tintHue = pTint < 0.15
    ? shRaw
    : sTint < 0.15
      ? phRaw
      : mixHue(phRaw, shRaw, sTint / tintTotal);

  const surfaceSat = dark
    ? clamp(14 + maxChroma * 0.48 + (pairDist > 90 ? 5 : 0), 14, 44)
    : clamp(28 + maxChroma * 0.58 + (pairDist > 90 ? 8 : 0), 30, 74);
  const borderSat = dark
    ? clamp(surfaceSat + 8, 16, 52)
    : clamp(surfaceSat + 24, 52, 92);

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
        semi = pill(140), released = pill(215), gray = pill(tintHue, 18),
        official = pill(20);

  const neutrals = dark
    ? { bg: 9, titlebar: 6, panel: 14, panel2: 19, border: 27, muted: 60, text: 92 }
    : { bg: 97, titlebar: 28, panel: 100, panel2: 94, border: 88, muted: 52, text: 17 };

  const titlebarHue = pTint < 0.15
    ? shRaw
    : sTint < 0.15
      ? phRaw
      : mixHue(shRaw, phRaw, pTint / tintTotal);
  const titlebarSat = dark
    ? clamp(surfaceSat + 20, 38, 72)
    : clamp(surfaceSat + 22, 58, 82);

  // When primary reads as neutral, use secondary for accent washes so chips/buttons tint visibly.
  const dimSource = pTint < 0.15 ? secondaryInput : primaryInput;

  return {
    bg: hsl(tintHue, surfaceSat, neutrals.bg),
    'bg-image': buildBgImage(dark, primaryInput, secondaryInput, tintHue, shRaw, surfaceSat),
    panel: dark
      ? hsl(tintHue, surfaceSat, neutrals.panel)
      : withAlpha('#ffffff', 0.82),
    'panel-2': dark
      ? hsl(tintHue, clamp(surfaceSat + 2, 14, 46), neutrals.panel2)
      : withAlpha(hsl(tintHue, clamp(surfaceSat * 0.55, 22, 52), neutrals.panel2), 0.72),
    'border-solid': hsl(tintHue, borderSat, neutrals.border),
    text: hsl(tintHue, dark ? 16 : clamp(surfaceSat * 0.65, 36, 58), neutrals.text),
    muted: hsl(tintHue, dark ? clamp(surfaceSat * 0.55, 14, 32) : clamp(surfaceSat * 0.58, 32, 48), neutrals.muted),
    titlebar: hsl(titlebarHue, titlebarSat, neutrals.titlebar),
    accent: primaryInput,
    'accent-contrast': accentContrast,
    'accent-dim': withAlpha(dimSource, dark ? 0.28 : 0.14),
    blue: secondaryInput,
    gold,
    red,
    shadow: dark ? 'none' : `0 2px 16px ${withAlpha(secondaryInput, 0.12)}`,
    radius: dark ? '12px' : '16px',
    'pill-planned-bg': planned.bg, 'pill-planned-fg': planned.fg,
    'pill-claimed-bg': claimed.bg, 'pill-claimed-fg': claimed.fg,
    'pill-unity-bg': unity.bg, 'pill-unity-fg': unity.fg,
    'pill-semi-bg': semi.bg, 'pill-semi-fg': semi.fg,
    'pill-released-bg': released.bg, 'pill-released-fg': released.fg,
    'pill-gray-bg': gray.bg, 'pill-gray-fg': gray.fg,
    'pill-official-bg': official.bg, 'pill-official-fg': official.fg,
  };
}
