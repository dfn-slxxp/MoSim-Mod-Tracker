// ---------------------------------------------------------------------------
// Fetch an FRC team's real robot source from a GitHub repo so the AI can read
// what the team actually built and translate it into a MoSim script.
//
// Uses the GitHub REST API for the file tree (1–2 calls, CORS-enabled) and
// raw.githubusercontent.com for file contents (served with `access-control-
// allow-origin: *`, and NOT counted against the 60 req/hr unauthenticated API
// limit — so many files is fine).
// ---------------------------------------------------------------------------

export interface RepoRef {
  owner: string;
  repo: string;
  branch?: string;
  dir?: string; // optional subpath from a /tree/<branch>/<dir> URL
}

/** Parse a GitHub repo URL (with or without /tree/branch/subdir, .git, git@). */
export function parseRepoUrl(url: string): RepoRef | null {
  const u = url.trim().replace(/\.git$/i, '');
  const m = u.match(/github\.com[/:]([^/\s]+)\/([^/\s]+)(?:\/tree\/([^/\s]+)(?:\/(.+))?)?/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2], branch: m[3], dir: m[4]?.replace(/\/$/, '') };
}

const SRC_EXT = /\.(java|kt|cpp|cc|cxx|hpp|hh|h|cs|py)$/i;
const SKIP_DIR = /(^|\/)(build|\.gradle|gradle|vendordeps|\.git|\.github|\.vscode|test|tests|node_modules|bin|obj|simgui)(\/|$)/i;

/** Lower number = more relevant to the robot's behavior (fetched first). */
function priority(path: string): number {
  const p = path.toLowerCase();
  if (p.includes('/subsystems/')) return 0;
  if (/robotcontainer\.(java|kt|cpp|cs|py)$/.test(p)) return 1;
  if (/\/robot\.(java|kt|cpp|cs|py)$/.test(p)) return 1;
  if (p.includes('/commands/')) return 2;
  if (p.includes('constants')) return 3;
  return 5;
}

export interface RepoSource {
  url: string;
  branch: string;
  files: Record<string, string>;
  count: number;
  truncated: boolean;
}

/**
 * Collect the robot source files from a repo, capped so the prompt stays within
 * a model's context. Prioritizes subsystems/commands/Robot/Constants.
 */
export async function fetchRepoSource(
  url: string,
  maxFiles = 30,
  maxTotalChars = 150_000
): Promise<RepoSource> {
  const ref = parseRepoUrl(url);
  if (!ref) {
    throw new Error('That doesn’t look like a GitHub repo URL. Example: https://github.com/team/robot-2025');
  }

  // Resolve the default branch if one wasn't given in the URL.
  let branch = ref.branch;
  if (!branch) {
    const meta = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}`);
    if (meta.status === 404) throw new Error('Repo not found — it may be private or the URL is wrong.');
    if (meta.status === 403) throw new Error('GitHub rate limit hit. Wait a few minutes and try again.');
    if (!meta.ok) throw new Error(`GitHub API error ${meta.status}.`);
    branch = ((await meta.json()) as { default_branch?: string }).default_branch || 'main';
  }

  const treeRes = await fetch(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  if (treeRes.status === 403) throw new Error('GitHub rate limit hit. Wait a few minutes and try again.');
  if (!treeRes.ok) throw new Error(`Couldn’t read the repo file tree (${treeRes.status}).`);
  const tree = ((await treeRes.json()) as { tree?: { path: string; type: string; size?: number }[] }).tree ?? [];

  const candidates = tree
    .filter((t) => t.type === 'blob' && SRC_EXT.test(t.path) && !SKIP_DIR.test(t.path))
    .filter((t) => (ref.dir ? t.path.startsWith(ref.dir + '/') || t.path === ref.dir : true))
    .filter((t) => (t.size ?? 0) < 80_000)
    .sort((a, b) => priority(a.path) - priority(b.path) || a.path.localeCompare(b.path));

  if (candidates.length === 0) {
    throw new Error('No robot source files (.java/.cpp/.py/.cs) found in that repo.');
  }

  const picked = candidates.slice(0, maxFiles);
  const rawBase = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${branch}`;
  const fetched = await Promise.all(
    picked.map(async (t) => {
      try {
        const rawPath = t.path.split('/').map(encodeURIComponent).join('/');
        const r = await fetch(`${rawBase}/${rawPath}`);
        return r.ok ? { path: t.path, text: await r.text() } : null;
      } catch {
        return null;
      }
    })
  );

  const files: Record<string, string> = {};
  let total = 0;
  let truncated = candidates.length > picked.length;
  for (const f of fetched) {
    if (!f) continue;
    if (total >= maxTotalChars) { truncated = true; break; }
    let text = f.text;
    if (total + text.length > maxTotalChars) {
      text = text.slice(0, maxTotalChars - total);
      truncated = true;
    }
    files[f.path] = text;
    total += text.length;
  }

  if (Object.keys(files).length === 0) throw new Error('Couldn’t download any source files from that repo.');
  return { url, branch, files, count: Object.keys(files).length, truncated };
}
