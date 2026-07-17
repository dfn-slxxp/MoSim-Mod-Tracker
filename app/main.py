"""
MoSim Mod Tracker — Python desktop app
Serves web/dist/ on a local HTTP server, then opens a pywebview window.
No Electron needed — works on Windows, macOS, Linux.

Install deps once:
    pip install pywebview

Then run:
    python app/main.py           (from the repo root)
    -- or --
    double-click run.bat / run.sh
"""

import os
import sys
import subprocess
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

import webview  # pip install pywebview

# ---------------------------------------------------------------------------
# Locate web/dist (works whether you run from repo root or from app/)
# ---------------------------------------------------------------------------
HERE     = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent
WEB_DIST  = REPO_ROOT / "web" / "dist"

if not WEB_DIST.exists():
    print(
        f"ERROR: {WEB_DIST} not found.\n"
        "Build the web app first:\n"
        "    cd web\n"
        "    npm install\n"
        "    npm run build"
    )
    sys.exit(1)

# ---------------------------------------------------------------------------
# Local HTTP server — the built React SPA needs a real server (file:// breaks
# HashRouter redirects and relative asset paths).
# ---------------------------------------------------------------------------

class _SilentHandler(SimpleHTTPRequestHandler):
    """Serves web/dist/ and swallows request logs."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIST), **kwargs)

    def log_message(self, *_):
        pass


def _start_server() -> int:
    """Bind to an OS-assigned port, start serving in a daemon thread, return the port."""
    server = HTTPServer(("127.0.0.1", 0), _SilentHandler)
    port   = server.server_address[1]
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return port

# ---------------------------------------------------------------------------
# Desktop API — each method here becomes window.pywebview.api.method_name()
# inside the web page. A small JS shim (DESKTOP_SHIM below) re-exposes them
# as window.desktop.* so the existing React code doesn't need to change.
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
            # Use Win32 SetWindowPos to toggle always-on-top without recreating
            # the window. HWND_TOPMOST/-1 = on top, HWND_NOTOPMOST/-2 = normal.
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
            # NSFloatingWindowLevel = 3 puts the window above everything.
            # NSNormalWindowLevel   = 0 returns it to normal stacking.
            import ctypes, ctypes.util
            objc = ctypes.cdll.LoadLibrary(ctypes.util.find_library("objc"))
            objc.objc_msgSend.restype = ctypes.c_void_p
            level = 3 if on_top else 0
            objc.objc_msgSend(
                win.native_handle,
                objc.sel_registerName(b"setLevel:"),
                ctypes.c_long(level),
            )

        # Linux/GTK: pywebview doesn't expose a reliable post-creation hook for
        # always-on-top. The window already starts with on_top=True; toggling off
        # and back on requires recreating — skip silently for now.

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
# Repo scanner — ports the logic from the old desktop/main.js to Python.
# Walks Assets/**/Robots/** for folders that contain a .prefab directly.
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
    """
    Returns a list of ScannedRobot-shaped dicts, one per robot mod folder.

    Rule: the folder must be a descendant of a 'Robots' directory AND must
    contain at least one .prefab file directly inside it. We skip 'Robots'
    and 'Mods' folders themselves (they're containers, not robot folders).
    """
    robots = []
    seen   = set()   # rel paths already added (multiple prefabs same dir)
    assets = repo_root / "Assets"
    if not assets.is_dir():
        return robots

    for prefab in assets.rglob("*.prefab"):
        folder = prefab.parent
        name   = folder.name

        if name in ("Robots", "Mods"):
            continue

        # Must have a 'Robots' ancestor somewhere in the path.
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
# Maps window.desktop.camelCase → window.pywebview.api.snake_case so the
# existing React components need zero changes.
# ---------------------------------------------------------------------------

DESKTOP_SHIM = """
(function () {
  if (window.desktop) return;   // already injected (hot-reload guard)
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
    port = _start_server()
    # Open in the compact splits view; click ⛶ or navigate to expand.
    url = f"http://127.0.0.1:{port}/#/compact"

    # win_ref lets the API object reference the window after creation.
    win_ref = [None]
    api     = DesktopAPI(win_ref)

    window = webview.create_window(
        title            = "MoSim Mod Tracker",
        url              = url,
        js_api           = api,
        width            = 360,
        height           = 640,
        on_top           = True,
        frameless        = False,   # keep the native OS frame
        background_color = "#0b0e14",
    )
    win_ref[0] = window

    # Inject the shim every time a page finishes loading (covers hash-router
    # navigations as well as the initial load).
    window.events.loaded += lambda: window.evaluate_js(DESKTOP_SHIM)

    webview.start(debug=False)


if __name__ == "__main__":
    main()
