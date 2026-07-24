// ---------------------------------------------------------------------------
// Repos page — the git repos your robot mods live in. Each repo stores:
//   - a remote URL (shown as a link everywhere)
//   - the last scan result (cached so the web UI can show it too)
// WHERE the repo lives on disk is a per-device fact (lib/repoPaths.ts,
// localStorage) — never on the shared server record, since the same repo shows
// on the web and on other machines where an absolute path is meaningless.
// "Scan" (desktop only) walks Assets/**/Robots/** for folders containing a
// .prefab, asks git for each folder's last commit date, caches the result, and
// auto-links any detected folder to a tracked robot when it's unambiguous.
// ---------------------------------------------------------------------------
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDialog } from '../components/Dialog';
import { useStore } from '../store/StoreContext';
import { getRepoPath, setRepoPath } from '../lib/repoPaths';
import type { Repo } from '../types';

function fmtDate(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function RepoCard({ repo }: { repo: Repo }) {
  const { robots, api, canEdit } = useStore();
  const { confirmDialog } = useDialog();
  const isDesktop = !!window.desktop;
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [autoMsg, setAutoMsg] = useState('');
  // Device-local folder for this repo (empty on web / until set on desktop).
  const [path, setPath] = useState(() => getRepoPath(repo.id));
  const [pathDraft, setPathDraft] = useState(path);
  const [editingPath, setEditingPath] = useState(false);

  // Tracker robots linked to this repo (via the Repo dropdown on a robot).
  const linked = robots.filter((r) => r.repoId === repo.id);

  const savePath = () => {
    const next = pathDraft.trim();
    setRepoPath(repo.id, next);
    setPath(next);
    setEditingPath(false);
  };

  // After a scan, link each detected folder to a tracked robot when the match is
  // unambiguous and that robot isn't already linked somewhere. Never overwrites
  // an existing link (that would be a conflict), never guesses on ties.
  const autolink = async (scanned: { name: string }[]) => {
    let linkedCount = 0;
    for (const sr of scanned) {
      const matches = robots.filter((t) => t.team === sr.name || t.name === sr.name);
      if (matches.length !== 1) continue; // no match, or ambiguous -> skip
      const t = matches[0];
      if (t.repoId) continue; // already linked (here or elsewhere) -> leave it
      await api.updateRobot(t.id, { repoId: repo.id });
      linkedCount += 1;
    }
    if (linkedCount > 0) {
      setAutoMsg(`Linked ${linkedCount} robot${linkedCount === 1 ? '' : 's'} to this repo.`);
    }
  };

  const scan = async () => {
    setScanning(true);
    setScanError('');
    setAutoMsg('');
    try {
      const res = await window.desktop!.scanRepo(path);
      if (!res.ok) throw new Error(res.error ?? 'Scan failed');
      await api.saveRepoScan(repo.id, { scannedAt: Date.now(), robots: res.robots });
      await autolink(res.robots);
    } catch (e) {
      setScanError((e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="repo-card">
      <div className="repo-head">
        <span className="repo-name">
          {repo.name}
          {repo.private && <span className="lock"> 🔒</span>}
        </span>
        {repo.remoteUrl && (
          <a href={repo.remoteUrl} target="_blank" rel="noreferrer" className="repo-link">
            {repo.remoteUrl.replace(/^https?:\/\//, '')} ↗
          </a>
        )}
        {isDesktop && path && (
          <button
            className="btn subtle"
            title="Open folder"
            onClick={() => window.desktop!.openPath(path)}
          >
            📂
          </button>
        )}
        <span className="spacer" />
        {canEdit && (
          <>
            {isDesktop && path && (
              <button className="btn" disabled={scanning} onClick={scan}>
                {scanning ? 'Scanning…' : repo.scan ? 'Rescan' : 'Scan'}
              </button>
            )}
            <label className="inline-check">
              <input
                type="checkbox"
                checked={repo.private}
                onChange={(e) => api.updateRepo(repo.id, { private: e.target.checked })}
              />
              Private
            </label>
            <button
              className="btn danger subtle"
              onClick={async () => {
                if (await confirmDialog({
                  title: 'Remove repo',
                  message: `Remove repo "${repo.name}"? (Doesn't touch the folder on disk.)`,
                  confirmLabel: 'Remove',
                }))
                  api.deleteRepo(repo.id);
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>

      {/* Device-local folder — desktop only. Scanning + reading scripts need a
          path on THIS PC; it's remembered per device, not on the server. */}
      {isDesktop && canEdit && (
        <div className="repo-folder">
          {editingPath || !path ? (
            <>
              <input
                className="grow"
                placeholder="Folder on this PC (e.g. C:\Users\Seb\Desktop\Private-Mods)"
                value={pathDraft}
                onChange={(e) => setPathDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') savePath();
                }}
              />
              <button className="btn" onClick={savePath}>Save folder</button>
              {path && (
                <button
                  className="btn subtle"
                  onClick={() => { setPathDraft(path); setEditingPath(false); }}
                >
                  Cancel
                </button>
              )}
            </>
          ) : (
            <>
              <span className="repo-path muted small">{path}</span>
              <button
                className="btn subtle"
                onClick={() => { setPathDraft(path); setEditingPath(true); }}
              >
                Change folder
              </button>
            </>
          )}
        </div>
      )}

      {/* Robots discovered on disk by the last scan */}
      {repo.scan ? (
        <>
          <div className="repo-scan-meta muted small">
            Scanned {fmtDate(repo.scan.scannedAt)} — {repo.scan.robots.length} robot folder
            {repo.scan.robots.length === 1 ? '' : 's'} found
          </div>
          {repo.scan.robots.length > 0 && (
            <table className="repo-table">
              <thead>
                <tr>
                  <th>Robot folder</th>
                  <th>Path</th>
                  <th>Last modified</th>
                  <th>Scripts</th>
                </tr>
              </thead>
              <tbody>
                {repo.scan.robots.map((r) => {
                  // Match a tracked robot by team number == folder name.
                  const tracked = robots.find((t) => t.team === r.name || t.name === r.name);
                  return (
                    <tr key={r.relPath}>
                      <td>
                        {tracked ? (
                          <Link to={`/robot/${tracked.id}`}>{r.name}</Link>
                        ) : (
                          r.name
                        )}
                      </td>
                      <td className="muted small">{r.relPath}</td>
                      <td>{fmtDate(r.lastModified)}</td>
                      <td className="muted small">
                        {r.scripts.map((s) => s.split('/').pop()).join(', ') || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <div className="muted small">
          {isDesktop
            ? 'Not scanned yet — set this repo’s folder above, then hit Scan to find robot folders.'
            : 'Not scanned yet — scanning reads your disk, so it runs from the desktop app.'}
        </div>
      )}

      {autoMsg && <div className="banner rounded">{autoMsg}</div>}
      {scanError && <div className="banner error rounded">{scanError}</div>}

      {linked.length > 0 && (
        <div className="repo-linked">
          <span className="muted small">Tracked robots in this repo: </span>
          {linked.map((r) => (
            <Link key={r.id} to={`/robot/${r.id}`} className="pack-chip link">
              {r.team ? `${r.team} ` : ''}
              {r.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReposPage() {
  const { repos, api, canEdit } = useStore();
  const { alertDialog } = useDialog();
  const [name, setName] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.addRepo({
        name: name.trim(),
        remoteUrl: remoteUrl.trim(),
        private: isPrivate
      });
      setName('');
      setRemoteUrl('');
    } catch (err) {
      void alertDialog((err as Error).message, 'Could not add repo');
    }
  };

  return (
    <div className="page wide">
      <div className="page-head">
        <h1>Repos</h1>
        <p className="muted">
          The git repos your mods live in. On the desktop app you can point each repo at its
          folder on this PC and scan it for robot folders (with their last git modification date).
        </p>
      </div>
      {canEdit && (
        <form className="add-form" onSubmit={submit}>
          <input placeholder="Repo name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input
            className="grow"
            placeholder="Remote URL (e.g. https://github.com/you/repo)"
            value={remoteUrl}
            onChange={(e) => setRemoteUrl(e.target.value)}
          />
          <label className="inline-check">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            Private
          </label>
          <button className="btn primary" type="submit">
            Add repo
          </button>
        </form>
      )}
      {repos.length === 0 && <div className="empty">No repos yet — add the folders your mods live in.</div>}
      <div className="repo-list">
        {repos.map((r) => (
          <RepoCard key={r.id} repo={r} />
        ))}
      </div>
    </div>
  );
}
