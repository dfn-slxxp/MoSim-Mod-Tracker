#!/usr/bin/env bash
# ── MoSim Mod Tracker — macOS DMG builder ────────────────────────────────────
# Run from the repo root:
#   bash installer/mac/build.sh [--version 1.0.0]
#
# Prerequisites (install once):
#   brew install create-dmg
#   pip install pywebview pyinstaller pillow
#   python installer/generate-assets.py     # creates installer/assets/
#   pyinstaller app/mosim-tracker.spec      # creates dist/mosim-tracker/
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSION="${1:-1.0.0}"
if [[ "${1:-}" == "--version" ]]; then VERSION="${2:?}"; fi

APP_NAME="MoSim Mod Tracker"
APP_BUNDLE="$REPO_ROOT/dist/$APP_NAME.app"
ASSETS="$REPO_ROOT/installer/assets"
OUT_DIR="$REPO_ROOT/dist/installers"
DMG_NAME="MoSim-Mod-Tracker-$VERSION-mac.dmg"

# ── Sanity checks ─────────────────────────────────────────────────────────────
if [[ "$(uname)" != "Darwin" ]]; then
  echo "❌  This script must run on macOS."
  exit 1
fi

if ! command -v create-dmg &>/dev/null; then
  echo "❌  create-dmg not found.  Install with:  brew install create-dmg"
  exit 1
fi

if [[ ! -d "$APP_BUNDLE" ]]; then
  echo "❌  App bundle not found at: $APP_BUNDLE"
  echo "    Run:  pyinstaller app/mosim-tracker.spec"
  exit 1
fi

if [[ ! -f "$ASSETS/icon.icns" ]]; then
  # Auto-generate ICNS from the PNG asset if needed
  if [[ ! -f "$ASSETS/icon.png" ]]; then
    echo "❌  installer/assets/icon.png not found."
    echo "    Run:  python installer/generate-assets.py"
    exit 1
  fi
  echo "→  Converting icon.png to icon.icns …"
  ICONSET="$ASSETS/AppIcon.iconset"
  mkdir -p "$ICONSET"
  for SIZE in 16 32 64 128 256 512; do
    sips -z "$SIZE" "$SIZE" "$ASSETS/icon.png" --out "$ICONSET/icon_${SIZE}x${SIZE}.png" &>/dev/null
    DOUBLE=$((SIZE * 2))
    sips -z "$DOUBLE" "$DOUBLE" "$ASSETS/icon.png" --out "$ICONSET/icon_${SIZE}x${SIZE}@2x.png" &>/dev/null
  done
  iconutil -c icns "$ICONSET" -o "$ASSETS/icon.icns"
  rm -rf "$ICONSET"
  echo "   ✓  icon.icns created"
fi

if [[ ! -f "$ASSETS/dmg-bg.png" ]]; then
  echo "❌  installer/assets/dmg-bg.png not found."
  echo "    Run:  python installer/generate-assets.py"
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "→  Building DMG: $DMG_NAME"

# Remove stale output
rm -f "$OUT_DIR/$DMG_NAME"

create-dmg \
  --volname "$APP_NAME" \
  --volicon "$ASSETS/icon.icns" \
  --background "$ASSETS/dmg-bg.png" \
  --window-pos 200 140 \
  --window-size 600 400 \
  --icon-size 90 \
  --icon "$APP_NAME.app" 160 190 \
  --hide-extension "$APP_NAME.app" \
  --app-drop-link 440 190 \
  --no-internet-enable \
  "$OUT_DIR/$DMG_NAME" \
  "$APP_BUNDLE"

echo ""
echo "✅  DMG ready: $OUT_DIR/$DMG_NAME"
echo ""
echo "Next steps:"
echo "  • Test by double-clicking the DMG and dragging to Applications"
echo "  • For distribution outside the App Store, sign + notarize:"
echo "      codesign --deep --force --sign 'Developer ID Application: <Team>' \"$APP_BUNDLE\""
echo "      xcrun notarytool submit \"$OUT_DIR/$DMG_NAME\" --wait --apple-id <email> --team-id <id> --password <app-password>"
echo "      xcrun stapler staple \"$OUT_DIR/$DMG_NAME\""
