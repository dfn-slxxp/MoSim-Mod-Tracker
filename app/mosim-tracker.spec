# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for MoSim Mod Tracker desktop app.
# Build from the repo root:
#   pip install pywebview pyinstaller
#   pyinstaller app/mosim-tracker.spec
# Output: dist/mosim-tracker/ (Windows/Linux) or dist/MoSim Mod Tracker.app (macOS)

import sys
from pathlib import Path

_here = Path(SPECPATH)  # noqa: F821 — SPECPATH is injected by PyInstaller

# Platform-specific pywebview backend imports
_hidden = ['webview']
if sys.platform == 'win32':
    _hidden += ['webview.platforms.winforms', 'clr', 'System', 'System.Windows.Forms']
elif sys.platform == 'darwin':
    _hidden += ['webview.platforms.cocoa', 'objc']
else:
    _hidden += ['webview.platforms.gtk', 'gi', 'gi.repository.Gtk', 'gi.repository.WebKit2']

_icon_win  = str(_here / '..' / 'installer' / 'assets' / 'icon.ico')
_icon_mac  = str(_here / '..' / 'installer' / 'assets' / 'icon.icns')
_icon_lin  = str(_here / '..' / 'installer' / 'assets' / 'icon.png')
_icon = _icon_win if sys.platform == 'win32' else (_icon_mac if sys.platform == 'darwin' else _icon_lin)

a = Analysis(
    [str(_here / 'main.py')],
    pathex=[str(_here)],
    binaries=[],
    datas=[],
    hiddenimports=_hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'unittest', 'email', 'html', 'http', 'urllib', 'xml'],
    noarchive=False,
)

pyz = PYZ(a.pure)  # noqa: F821

exe = EXE(  # noqa: F821
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='MoSim Mod Tracker',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    icon=_icon,
)

coll = COLLECT(  # noqa: F821
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='mosim-tracker',
)

# macOS only: wrap the collected output in a .app bundle
if sys.platform == 'darwin':
    app = BUNDLE(  # noqa: F821
        coll,
        name='MoSim Mod Tracker.app',
        icon=_icon_mac,
        bundle_identifier='com.mosim.mod-tracker',
        version='1.0.0',
        info_plist={
            'NSHighResolutionCapable': True,
            'CFBundleDisplayName': 'MoSim Mod Tracker',
            'CFBundleShortVersionString': '1.0.0',
        },
    )
