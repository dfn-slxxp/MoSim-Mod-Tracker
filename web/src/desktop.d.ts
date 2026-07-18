// ---------------------------------------------------------------------------
// Type declarations for the bridge the desktop app injects (desktop/preload.js
// exposes these via Electron's contextBridge). In a normal browser
// `window.desktop` is undefined — code must always check before using it.
// ---------------------------------------------------------------------------
import type { ScannedRobot } from './types';

export interface DesktopAPI {
  togglePin(): Promise<boolean>;
  isPinned(): Promise<boolean>;
  /** Switch the window between compact (splits) and expanded (full UI) sizes. */
  setExpanded(expanded: boolean): Promise<void>;
  close(): Promise<void>;
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;

  /** Scan a local repo folder for robot mod folders (+ git last-modified). */
  scanRepo(localPath: string): Promise<{ ok: boolean; error?: string; robots: ScannedRobot[] }>;
  /** Read a .cs script from inside a repo (path-checked in the main process). */
  readScript(repoPath: string, relPath: string): Promise<{ ok: boolean; error?: string; content: string }>;
  /** Open a folder in the OS file explorer, or a URL in the default browser. */
  openPath(pathOrUrl: string): Promise<void>;
}

declare global {
  interface Window {
    desktop?: DesktopAPI;
  }
}

export {};
