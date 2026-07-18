#!/usr/bin/env python3
"""
Generate installer assets for MoSim Mod Tracker.

Run once before building any installer:
    pip install pillow
    python installer/generate-assets.py

Outputs (all in installer/assets/):
    wizard-side.bmp   164×314  Inno Setup left panel
    wizard-small.bmp  55×58    Inno Setup inner-page corner logo
    icon.png          512×512  Cross-platform app icon
    icon.ico          Multi-size Windows icon  (16–256 px)
    dmg-bg.png        600×400  macOS DMG background
"""

import math
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:
    print("Install Pillow first:  pip install pillow")
    sys.exit(1)

# ── Output directory ──────────────────────────────────────────────────────────
OUT = Path(__file__).parent / 'assets'
OUT.mkdir(exist_ok=True)

# ── Brand palette ─────────────────────────────────────────────────────────────
BG_TOP    = (8,  12, 26)    # space navy
BG_MID    = (18,  9, 48)    # deep violet
BG_BOT    = (10, 25, 56)    # midnight blue
CYAN      = (0, 212, 255)
VIOLET    = (180, 90, 255)
RED_ACC   = (255, 107, 107)
WHITE     = (255, 255, 255)

# ── Colour helpers ────────────────────────────────────────────────────────────

def lerp(a, b, t):
    return int(a + (b - a) * t)

def lerp_rgb(c1, c2, t):
    return tuple(lerp(c1[i], c2[i], t) for i in range(3))

def gradient_row(y, height, stops):
    """Interpolate colour at `y` from a list of (t, rgb) stops."""
    t = y / max(height - 1, 1)
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t0 <= t <= t1:
            s = (t - t0) / (t1 - t0) if t1 != t0 else 0.0
            return lerp_rgb(c0, c1, s)
    return stops[-1][1]

# ── Font loading ──────────────────────────────────────────────────────────────

def load_font(size):
    candidates = [
        # Windows
        'C:/Windows/Fonts/arialbd.ttf',
        'C:/Windows/Fonts/arial.ttf',
        # macOS
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Arial Bold.ttf',
        # Linux
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except (IOError, OSError):
            continue
    return ImageFont.load_default()

# ── Avatar image ──────────────────────────────────────────────────────────────

def _remove_white_bg(img, threshold=240):
    """Replace near-white pixels with transparent so the avatar composites cleanly."""
    img = img.convert('RGBA')
    pixels = list(img.getdata())
    new_pixels = [
        (r, g, b, 0) if (r >= threshold and g >= threshold and b >= threshold) else (r, g, b, a)
        for r, g, b, a in pixels
    ]
    result = Image.new('RGBA', img.size)
    result.putdata(new_pixels)
    return result

_AVATAR_PATH = Path(__file__).parent / 'assets' / 'avatar.png'
_avatar_cache = None

def _get_avatar():
    global _avatar_cache
    if _avatar_cache is None:
        _avatar_cache = _remove_white_bg(Image.open(_AVATAR_PATH))
    return _avatar_cache

def paste_avatar(base_rgba, size, cx, cy):
    """Paste the pixel-art avatar (NEAREST scale) centered at (cx, cy)."""
    av = _get_avatar().resize((size, size), Image.NEAREST)
    x, y = cx - size // 2, cy - size // 2
    base_rgba.alpha_composite(av, (max(0, x), max(0, y)))

# ── Main panel drawing ────────────────────────────────────────────────────────

GRAD_STOPS = [
    (0.00, BG_TOP),
    (0.35, BG_MID),
    (0.70, (13, 20, 52)),
    (1.00, BG_BOT),
]

def draw_bg(img):
    """Fill img with the brand gradient."""
    pix = img.load()
    W, H = img.size
    for y in range(H):
        c = gradient_row(y, H, GRAD_STOPS)
        for x in range(W):
            # Subtle left-to-right tint (darker left edge)
            blend = x / max(W - 1, 1) * 0.08
            tinted = tuple(int(c[i] * (1 - blend) + BG_MID[i] * blend) for i in range(3))
            pix[x, y] = tinted


def draw_circuit(draw, W, H):
    """Grid + highlighted traces + nodes."""
    step = 28

    # Faint grid
    for x in range(step // 2, W, step):
        draw.line([(x, 0), (x, H)], fill=(*CYAN, 18), width=1)
    for y in range(step // 2, H, step):
        draw.line([(0, y), (W, y)], fill=(*CYAN, 18), width=1)

    # Highlighted traces (cyan, 28% opacity)
    traces = [
        ('h', None, 56,  0,    82  ),
        ('v', 82,   None, 56,  H//2 - 28),
        ('h', None, 122, 82,   W   ),
        ('v', 26,   None, H//2 + 30, H//2 + 112),
        ('h', None, H//2 + 112, 0,  54  ),
        ('h', None, H//2 + 30, 26,  W   ),
        ('v', W-28, None, 0,   56  ),
    ]
    for t in traces:
        if t[0] == 'h':
            draw.line([(t[3], t[2]), (t[4], t[2])], fill=(*CYAN, 70), width=1)
        else:
            draw.line([(t[1], t[3]), (t[1], t[4])], fill=(*CYAN, 70), width=1)

    # Glowing circuit nodes
    nodes = [
        (82,    56,  CYAN,   3),
        (82,    122, CYAN,   3),
        (W-28,  56,  CYAN,   2),
        (26,    H//2 + 30,  VIOLET, 3),
        (26,    H//2 + 112, VIOLET, 3),
        (54,    H//2 + 112, CYAN,   2),
    ]
    for nx, ny, col, r in nodes:
        # Soft glow ring
        for i in range(3, 0, -1):
            alpha = [60, 110, 180][3 - i]
            draw.ellipse(
                [nx - r * i * 2, ny - r * i * 2, nx + r * i * 2, ny + r * i * 2],
                fill=(*col, alpha // (i * 2))
            )
        draw.ellipse([nx - r, ny - r, nx + r, ny + r], fill=(*col, 220))

    # Accent sparkles
    sparks = [(14, 30, RED_ACC), (W-16, H-24, CYAN), (10, H-14, VIOLET), (W-16, 140, RED_ACC)]
    for sx, sy, col in sparks:
        draw.ellipse([sx-4, sy-4, sx+4, sy+4], fill=(*col, 50))
        draw.ellipse([sx-2, sy-2, sx+2, sy+2], fill=(*col, 160))


def draw_side_panel(W=164, H=314):
    img = Image.new('RGBA', (W, H))
    draw_bg(img)
    draw = ImageDraw.Draw(img, 'RGBA')
    draw_circuit(draw, W, H)

    paste_avatar(img, 96, W // 2, H // 2 - 28)

    # App name
    d = ImageDraw.Draw(img)
    font_name = load_font(11)
    font_sub  = load_font(10)
    d.text((W // 2, H - 42), 'MoSim',        font=font_name, fill=(*WHITE, 230), anchor='mm')
    d.text((W // 2, H - 28), 'Mod Tracker',  font=font_sub,  fill=(*WHITE, 160), anchor='mm')

    return img.convert('RGB')


def draw_small_logo(W=55, H=58):
    img = Image.new('RGBA', (W, H))
    draw_bg(img)
    paste_avatar(img, 44, W // 2, H // 2)
    return img.convert('RGB')


def draw_icon(size=512):
    img = Image.new('RGBA', (size, size))
    s = size
    d = ImageDraw.Draw(img, 'RGBA')

    # Rounded-square background (gradient)
    # Draw gradient into temp layer
    bg = Image.new('RGB', (s, s))
    draw_bg(bg)

    # Rounded square mask
    mask = Image.new('L', (s, s), 0)
    md   = ImageDraw.Draw(mask)
    r    = int(s * 0.22)
    md.rounded_rectangle([0, 0, s, s], radius=r, fill=255)

    img.paste(bg, (0, 0))
    img.putalpha(mask)

    # Circuit accents (lighter, icon scale)
    cd = ImageDraw.Draw(img, 'RGBA')
    step = int(s * 0.17)
    for x in range(step, s, step):
        cd.line([(x, 0), (x, s)], fill=(*CYAN, 12), width=1)
    for y in range(step, s, step):
        cd.line([(0, y), (s, y)], fill=(*CYAN, 12), width=1)

    # Glow accent circles
    for ax, ay, col, al in [
        (int(s*.8), int(s*.2), CYAN,   60),
        (int(s*.2), int(s*.8), VIOLET, 70),
    ]:
        gr = int(s * 0.35)
        for i in range(5, 0, -1):
            cd.ellipse([ax - gr//i, ay - gr//i, ax + gr//i, ay + gr//i],
                       fill=(*col, al // i))

    paste_avatar(img, int(s * 0.72), s // 2, s // 2)

    return img


def draw_dmg_bg(W=600, H=400):
    img = Image.new('RGBA', (W, H))
    draw_bg(img)
    draw = ImageDraw.Draw(img, 'RGBA')
    draw_circuit(draw, W, H)

    # App icon area (left)
    icon_x, icon_y, icon_size = 160, 155, 90
    icon_mini = draw_icon(icon_size).convert('RGBA')
    img.paste(icon_mini, (icon_x - icon_size // 2, icon_y - icon_size // 2), icon_mini)

    # Label
    font_lbl = load_font(13)
    font_sub  = load_font(11)
    draw.text((icon_x, icon_y + icon_size // 2 + 16), 'MoSim Mod Tracker',
              font=font_lbl, fill=(*WHITE, 220), anchor='mm')

    # Arrow
    ax, ay = W // 2, H // 2
    pts = [(ax - 20, ay - 8), (ax + 14, ay - 8), (ax + 14, ay - 18), (ax + 34, ay), (ax + 14, ay + 18), (ax + 14, ay + 8), (ax - 20, ay + 8)]
    draw.polygon(pts, fill=(*CYAN, 140))

    # Applications placeholder (right)
    app_x, app_y = W - 160, 155
    sz = icon_size
    draw.rounded_rectangle([app_x - sz//2, app_y - sz//2, app_x + sz//2, app_y + sz//2],
                            radius=14, fill=(*VIOLET, 40), outline=(*VIOLET, 80), width=2)
    font_folder = load_font(32)
    draw.text((app_x, app_y), 'A', font=font_folder, fill=(*WHITE, 160), anchor='mm')
    draw.text((app_x, app_y + sz // 2 + 16), 'Applications',
              font=font_sub, fill=(*WHITE, 200), anchor='mm')

    # Instruction text
    font_inst = load_font(12)
    draw.text((W // 2, H - 32), 'Drag MoSim Mod Tracker to Applications to install',
              font=font_inst, fill=(*WHITE, 120), anchor='mm')

    return img.convert('RGB')

# ── Generate all assets ───────────────────────────────────────────────────────

def main():
    print('Generating installer assets…')

    side = draw_side_panel(164, 314)
    side.save(OUT / 'wizard-side.bmp')
    print(f'  OK wizard-side.bmp  (164x314)')

    small = draw_small_logo(55, 58)
    small.save(OUT / 'wizard-small.bmp')
    print(f'  OK wizard-small.bmp  (55x58)')

    icon_base = draw_icon(512)
    icon_base.save(OUT / 'icon.png')
    print(f'  OK icon.png  (512x512)')

    # Multi-size ICO
    sizes = [16, 24, 32, 48, 64, 128, 256]
    ico_images = [draw_icon(s).convert('RGBA') for s in sizes]
    ico_images[0].save(
        OUT / 'icon.ico',
        format='ICO',
        append_images=ico_images[1:],
        sizes=[(s, s) for s in sizes],
    )
    print(f'  OK icon.ico  ({", ".join(str(s) for s in sizes)}px)')

    dmg = draw_dmg_bg(600, 400)
    dmg.save(OUT / 'dmg-bg.png')
    print(f'  OK dmg-bg.png  (600x400)')

    print(f'\nAll assets written to {OUT.resolve()}')
    print('Next: pyinstaller app/mosim-tracker.spec')
    print('Then: iscc installer/windows/setup.iss  (Windows)')
    print('  or: bash installer/mac/build.sh        (macOS)')
    print('  or: bash installer/linux/build.sh      (Linux)')


if __name__ == '__main__':
    main()
