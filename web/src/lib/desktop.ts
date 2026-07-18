// Tauri bridge — wires up window.desktop when running inside the Tauri shell.
// In a plain browser __TAURI_INTERNALS__ is never injected, so isTauri()
// returns false and nothing here runs. Components use window.desktop?.method()
// so they degrade gracefully on the web.

export const isTauri = (): boolean => '__TAURI_INTERNALS__' in window;

// Lazy-import Tauri API so the browser bundle never tries to load it.
async function inv<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export async function tauriListen<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  return listen<T>(event, (e) => handler(e.payload));
}

export async function getServerUrl(): Promise<string> {
  return inv<string>('get_server_url');
}

/** Auth token captured from a cold-start deep link, if any (one-shot). */
export async function takePendingAuthToken(): Promise<string | null> {
  return inv<string | null>('take_pending_auth_token');
}


export async function openInBrowser(url: string): Promise<void> {
  return inv('open_path', { pathOrUrl: url });
}

/** Stamp pin state on <html> so CSS can react (pinned + blurred = see-through). */
function stampPinned(pinned: boolean): boolean {
  document.documentElement.dataset.pinned = String(pinned);
  return pinned;
}

// Mirror the exact window.desktop shape from desktop/preload.js so all
// existing React components work in Tauri without any changes.
if (isTauri()) {
  (window as unknown as Record<string, unknown>).desktop = {
    togglePin:   ()                               => inv<boolean>('toggle_pin').then(stampPinned),
    isPinned:    ()                               => inv<boolean>('is_pinned').then(stampPinned),
    setExpanded: (expanded: boolean)              => inv('set_expanded', { expanded }),
    close:       ()                               => inv('close_window'),
    minimize:    ()                               => inv('minimize_window'),
    toggleMaximize: ()                            => inv('toggle_maximize'),
    scanRepo:    (localPath: string)              => inv('scan_repo', { localPath }),
    readScript:  (repoPath: string, relPath: string) => inv('read_script', { repoPath, relPath }),
    openPath:    (pathOrUrl: string)              => inv('open_path', { pathOrUrl }),
  };

  // Desktop chrome state for CSS: the window is transparent + undecorated, so
  // styles key off these to draw the rounded shell and the semi-transparent
  // background when the window is pinned on top but not focused.
  document.documentElement.dataset.desktop = 'true';
  document.documentElement.dataset.blurred = String(!document.hasFocus());
  window.addEventListener('blur',  () => { document.documentElement.dataset.blurred = 'true'; });
  window.addEventListener('focus', () => { document.documentElement.dataset.blurred = 'false'; });
  void inv<boolean>('is_pinned').then(stampPinned).catch(() => {});
}
