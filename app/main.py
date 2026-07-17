"""
MoSim Mod Tracker — Python desktop app
Opens a pywebview window pointed at the configured server URL.
No Electron needed — works on Windows, macOS, Linux.

Install deps once:
    pip install pywebview

Run (set MOSIM_URL to your deployed server, or leave unset for local dev):
    python app/main.py
    -- or --
    double-click run.bat / run.sh

For local dev: run `node server/server.js` first, then this script.
For production: set MOSIM_URL=https://mods.yoursite.com in your environment.
"""

import os
import sys
import subprocess
import webbrowser
from pathlib import Path

import webview  # pip install pywebview

# ---------------------------------------------------------------------------
# Desktop API — each method here becomes window.pywebview.api.method_name()
# inside the web page. A small JS shim (DESKTOP_SHIM below) re-exposes them
# as window.desktop.* so the existing React code needs zero changes.
# ---------------------------------------------------------------------------

class DesktopAPI:

    def __init__(self, win_ref: list):
        # win_ref is a one-element list so we can set window after create_window.
        self._win    = win_ref
        self._pinned = True   # always-on-top starts enabled

    # --- always-on-top ---------------------------------------------------------

    def toggle_pin(self) -> bool:
        self._pinned = not self._pinned
        self._set_topmost(self._pinned)
        return self._pinned

    def is_pinned(self) -> bool:
        return self._pinned

    def _set_topmost(self, on_top: bool):
        win = self._win[0]
        if win is None:
            return

        if sys.platform == "win32":
            import ctypes
            HWND_TOPMOST   = -1
            HWND_NOTOPMOST = -2
            SWP_NOMOVE = 0x0002
            SWP_NOSIZE = 0x0001
            ctypes.windll.user32.SetWindowPos(
                win.native_handle,
                HWND_TOPMOST if on_top else HWND_NOTOPMOST,
                0, 0, 0, 0,
                SWP_NOMOVE | SWP_NOSIZE,
            )

        elif sys.platform == "darwin":
            import ctypes, ctypes.util
            objc = ctypes.cdll.LoadLibrary(ctypes.util.find_library("objc"))
            objc.objc_msgSend.restype = ctypes.c_void_p
            level = 3 if on_top else 0
            objc.objc_msgSend(
                win.native_handle,
                objc.sel_registerName(b"setLevel:"),
                ctypes.c_long(level),
            )

    # --- window size -----------------------------------------------------------

    def set_expanded(self, expanded: bool):
        win = self._win[0]
        if win is None:
            return
        if expanded:
            win.resize(1000, 800)
        else:
            win.resize(360, 640)

    def close(self):
        win = self._win[0]
        if win is not None:
            win.destroy()

    # --- repo scanning ---------------------------------------------------------

    def scan_repo(self, local_path: str) -> dict:
        root = Path(local_path)
        if not root.is_dir():
            return {"ok": False, "error": f"Directory not found: {local_path}", "robots": []}
        try:
            return {"ok": True, "robots": _scan_robots(root)}
        except Exception as exc:
            return {"ok": False, "error": str(exc), "robots": []}

    def read_script(self, repo_path: str, rel_path: str) -> dict:
        # Security: only .cs, no traversal outside the repo.
        if not rel_path.endswith(".cs"):
            return {"ok": False, "error": "Only .cs files allowed", "content": ""}
        full      = (Path(repo_path) / rel_path).resolve()
        repo_root = Path(repo_path).resolve()
        try:
            full.relative_to(repo_root)   # raises if traversal attempted
        except ValueError:
            return {"ok": False, "error": "Path traversal rejected", "content": ""}
        if not full.is_file():
            return {"ok": False, "error": "File not found", "content": ""}
        try:
            return {"ok": True, "content": full.read_text(encoding="utf-8", errors="replace")}
        except Exception as exc:
            return {"ok": False, "error": str(exc), "content": ""}

    def open_path(self, path_or_url: str):
        if path_or_url.startswith(("http://", "https://")):
            webbrowser.open(path_or_url)
        else:
            p = Path(path_or_url)
            if p.exists():
                if sys.platform == "win32":
                    os.startfile(str(p))
                elif sys.platform == "darwin":
                    subprocess.Popen(["open", str(p)])
                else:
                    subprocess.Popen(["xdg-open", str(p)])

# ---------------------------------------------------------------------------
# Repo scanner — walks Assets/**/Robots/** for folders containing a .prefab.
# ---------------------------------------------------------------------------

def _git_mtime(repo_root: Path, rel: str) -> int:
    """Unix-ms of the latest git commit touching `rel`. Falls back to file mtime."""
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_root), "log", "-1", "--format=%ct", "--", rel],
            capture_output=True, text=True, timeout=5,
        )
        ts = result.stdout.strip()
        if ts:
            return int(ts) * 1000
    except Exception:
        pass
    folder = repo_root / rel
    try:
        return int(max(f.stat().st_mtime for f in folder.rglob("*") if f.is_file()) * 1000)
    except Exception:
        return 0


def _scan_robots(repo_root: Path) -> list:
    robots = []
    seen   = set()
    assets = repo_root / "Assets"
    if not assets.is_dir():
        return robots

    for prefab in assets.rglob("*.prefab"):
        folder = prefab.parent
        name   = folder.name

        if name in ("Robots", "Mods"):
            continue

        ancestors = {p.name for p in folder.parents}
        if "Robots" not in ancestors:
            continue

        rel = folder.relative_to(repo_root).as_posix()
        if rel in seen:
            continue
        seen.add(rel)

        scripts = sorted(
            f.relative_to(repo_root).as_posix() for f in folder.rglob("*.cs")
        )
        robots.append({
            "name":         name,
            "relPath":      rel,
            "lastModified": _git_mtime(repo_root, rel),
            "scripts":      scripts,
        })

    robots.sort(key=lambda r: r["name"].lower())
    return robots

# ---------------------------------------------------------------------------
# JS shim injected on every page load.
# Maps window.desktop.camelCase → window.pywebview.api.snake_case
# ---------------------------------------------------------------------------

DESKTOP_SHIM = """
(function () {
  if (window.desktop) return;
  function call(name) {
    return function () {
      return window.pywebview.api[name].apply(null, arguments);
    };
  }
  window.desktop = {
    togglePin:   call('toggle_pin'),
    isPinned:    call('is_pinned'),
    setExpanded: call('set_expanded'),
    close:       call('close'),
    scanRepo:    call('scan_repo'),
    readScript:  call('read_script'),
    openPath:    call('open_path'),
  };
})();
"""

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    # Point at a running server. Default: local dev server on 8787.
    # Set MOSIM_URL=https://mods.yoursite.com for the deployed app.
    server_url = os.environ.get('MOSIM_URL', 'http://localhost:8787')
    url = server_url.rstrip('/') + '/#/compact'

    win_ref = [None]
    api     = DesktopAPI(win_ref)

    window = webview.create_window(
        title            = "MoSim Mod Tracker",
        url              = url,
        js_api           = api,
        width            = 360,
        height           = 640,
        on_top           = True,
        frameless        = False,
        background_color = "#0b0e14",
    )
    win_ref[0] = window

    window.events.loaded += lambda: window.evaluate_js(DESKTOP_SHIM)

    webview.start(debug=False)


if __name__ == "__main__":
    main()
