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

export async function openInBrowser(url: string): Promise<void> {
  return inv('open_path', { pathOrUrl: url });
}

// Mirror the exact window.desktop shape from desktop/preload.js so all
// existing React components work in Tauri without any changes.
if (isTauri()) {
  (window as Record<string, unknown>).desktop = {
    togglePin:   ()                               => inv<boolean>('toggle_pin'),
    isPinned:    ()                               => inv<boolean>('is_pinned'),
    setExpanded: (expanded: boolean)              => inv('set_expanded', { expanded }),
    close:       ()                               => inv('close_window'),
    scanRepo:    (localPath: string)              => inv('scan_repo', { localPath }),
    readScript:  (repoPath: string, relPath: string) => inv('read_script', { repoPath, relPath }),
    openPath:    (pathOrUrl: string)              => inv('open_path', { pathOrUrl }),
  };
}
