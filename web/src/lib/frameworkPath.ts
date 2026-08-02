// Where the local RobotFramework source checkout lives on disk (e.g.
// MoSim-Reefscape-Public/Assets/Scripts/RobotFramework) is a PER-DEVICE fact,
// just like a repo's local path (see repoPaths.ts) — it's only used by the
// desktop app to read reference .cs files into a generated AI prompt.

const KEY = 'mosim-framework-path';

export function getFrameworkPath(): string {
  return localStorage.getItem(KEY) ?? '';
}

export function setFrameworkPath(path: string): void {
  const trimmed = path.trim();
  if (trimmed) localStorage.setItem(KEY, trimmed);
  else localStorage.removeItem(KEY);
}
