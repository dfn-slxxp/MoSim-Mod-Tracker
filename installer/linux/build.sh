#!/usr/bin/env bash
# ── MoSim Mod Tracker — Linux AppImage builder ───────────────────────────────
# Run from the repo root:
#   bash installer/linux/build.sh [--version 1.0.0]
#
# Prerequisites (install once):
#   pip install pywebview pyinstaller pillow
#   python installer/generate-assets.py     # creates installer/assets/
#   pyinstaller app/mosim-tracker.spec      # creates dist/mosim-tracker/
#   wget -O ~/bin/appimagetool \
#     https://github.com/AppImage/AppImageKit/releases/latest/download/appimagetool-x86_64.AppImage
#   chmod +x ~/bin/appimagetool
#
# Runtime deps the user needs (GTK + WebKit2GTK):
#   Ubuntu/Debian:  apt install python3-gi gir1.2-gtk-3.0 gir1.2-webkit2-4.0
#   Arch:           pacman -S python-gobject webkit2gtk
#   Fedora:         dnf install python3-gobject webkit2gtk4.0
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSION="${1:-1.0.0}"
if [[ "${1:-}" == "--version" ]]; then VERSION="${2:?}"; fi

APP_ID="com.mosim.mod-tracker"
APP_DISPLAY="MoSim Mod Tracker"
DIST_DIR="$REPO_ROOT/dist/mosim-tracker"
ASSETS="$REPO_ROOT/installer/assets"
OUT_DIR="$REPO_ROOT/dist/installers"
APPDIR="$REPO_ROOT/dist/MoSimModTracker.AppDir"

# ── Sanity checks ─────────────────────────────────────────────────────────────
if [[ "$(uname)" != "Linux" ]]; then
  echo "❌  This script must run on Linux."
  exit 1
fi

APPIMAGETOOL=""
for candidate in appimagetool ~/bin/appimagetool /usr/local/bin/appimagetool; do
  if command -v "$candidate" &>/dev/null; then
    APPIMAGETOOL="$candidate"; break
  fi
done
if [[ -z "$APPIMAGETOOL" ]]; then
  echo "❌  appimagetool not found."
  echo "    Download from: https://github.com/AppImage/AppImageKit/releases/latest"
  echo "    wget -O ~/bin/appimagetool https://github.com/AppImage/AppImageKit/releases/latest/download/appimagetool-x86_64.AppImage"
  echo "    chmod +x ~/bin/appimagetool"
  exit 1
fi

if [[ ! -d "$DIST_DIR" ]]; then
  echo "❌  PyInstaller output not found at: $DIST_DIR"
  echo "    Run:  pyinstaller app/mosim-tracker.spec"
  exit 1
fi

if [[ ! -f "$ASSETS/icon.png" ]]; then
  echo "❌  installer/assets/icon.png not found."
  echo "    Run:  python installer/generate-assets.py"
  exit 1
fi

mkdir -p "$OUT_DIR"

# ── Build the AppDir ──────────────────────────────────────────────────────────
echo "→  Assembling AppDir …"
rm -rf "$APPDIR"
mkdir -p "$APPDIR/usr/bin" "$APPDIR/usr/lib" "$APPDIR/usr/share/applications" "$APPDIR/usr/share/icons/hicolor/512x512/apps"

# Copy PyInstaller output
cp -r "$DIST_DIR/." "$APPDIR/usr/bin/"

# Desktop file
cat > "$APPDIR/usr/share/applications/$APP_ID.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=$APP_DISPLAY
Comment=LiveSplit-style mod tracker for robot soccer sims
Exec=MoSim Mod Tracker
Icon=$APP_ID
Categories=Game;Utility;
Keywords=mosim;robots;tracker;
StartupWMClass=mosim-mod-tracker
EOF

# Icon
cp "$ASSETS/icon.png" "$APPDIR/usr/share/icons/hicolor/512x512/apps/$APP_ID.png"

# AppStream metainfo
mkdir -p "$APPDIR/usr/share/metainfo"
cat > "$APPDIR/usr/share/metainfo/$APP_ID.metainfo.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>$APP_ID</id>
  <name>$APP_DISPLAY</name>
  <summary>LiveSplit-style mod tracker for robot soccer sims</summary>
  <metadata_license>MIT</metadata_license>
  <project_license>MIT</project_license>
  <releases>
    <release version="$VERSION" date="$(date +%Y-%m-%d)"/>
  </releases>
</component>
EOF

# AppRun launcher — writes mosim.conf if not present, then starts the app
cat > "$APPDIR/AppRun" <<'APPRUN'
#!/usr/bin/env bash
set -euo pipefail
HERE="$(dirname "$(readlink -f "$0")")"
CONF="$HERE/usr/bin/mosim.conf"

if [[ ! -f "$CONF" ]]; then
  echo "MOSIM_URL=http://localhost:8787" > "$CONF"
fi

export LD_LIBRARY_PATH="${HERE}/usr/lib:${LD_LIBRARY_PATH:-}"
exec "${HERE}/usr/bin/MoSim Mod Tracker" "$@"
APPRUN
chmod +x "$APPDIR/AppRun"

# Symlinks expected by appimagetool in the AppDir root
ln -sf "usr/share/applications/$APP_ID.desktop" "$APPDIR/$APP_ID.desktop"
ln -sf "usr/share/icons/hicolor/512x512/apps/$APP_ID.png" "$APPDIR/$APP_ID.png"

# ── Build the AppImage ────────────────────────────────────────────────────────
ARCH="$(uname -m)"
OUT_FILE="$OUT_DIR/MoSim-Mod-Tracker-$VERSION-linux-$ARCH.AppImage"

echo "→  Packaging AppImage …"
ARCH="$ARCH" "$APPIMAGETOOL" "$APPDIR" "$OUT_FILE"
chmod +x "$OUT_FILE"

echo ""
echo "✅  AppImage ready: $OUT_FILE"
echo ""
echo "Usage:"
echo "  chmod +x $OUT_FILE"
echo "  ./$OUT_FILE"
echo ""
echo "Runtime deps (if not using a bundled build):"
echo "  Ubuntu/Debian:  apt install gir1.2-webkit2-4.0"
echo "  Arch:           pacman -S webkit2gtk"
echo "  Fedora:         dnf install webkit2gtk4.0"
