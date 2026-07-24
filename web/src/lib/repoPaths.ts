// Where a repo lives on disk is a PER-DEVICE fact, not shared data. The repo
// record on the server has no path (it syncs to the web and to other machines,
// where an absolute path from one PC is meaningless). Instead, each device
// remembers its own folder for a given repo id here in localStorage.
//
// Only the desktop app ever sets or uses these (scanning + reading scripts off
// disk). On the web they stay empty and the disk features simply don't show.

const KEY = 'mosim-repo-paths';

type PathMap = Record<string, string>;

function load(): PathMap {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as PathMap) : {};
  } catch {
    return {};
  }
}

/** This device's folder for the given repo, or '' if none set. */
export function getRepoPath(id: string): string {
  return load()[id] || '';
}

/** Remember (or, with an empty path, forget) this device's folder for a repo. */
export function setRepoPath(id: string, path: string): void {
  const all = load();
  const trimmed = path.trim();
  if (trimmed) all[id] = trimmed;
  else delete all[id];
  localStorage.setItem(KEY, JSON.stringify(all));
}
