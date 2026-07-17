// ---------------------------------------------------------------------------
// Repos page — the git repos your robot mods live in. Each repo stores:
//   - a local path (used by the DESKTOP app to scan folders + read scripts)
//   - a remote URL (shown as a link everywhere)
// "Scan" walks Assets/**/Robots/** for folders containing a .prefab, asks git
// for each folder's last commit date, and caches the result on the repo record
// so the web UI (which can't touch your disk) still shows everything.
// ---------------------------------------------------------------------------
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
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
  const isDesktop = !!window.desktop;
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  // Tracker robots linked to this repo (via the Repo dropdown on a robot).
  const linked = robots.filter((r) => r.repoId === repo.id);

  const scan = async () => {
    setScanning(true);
    setScanError('');
    try {
      const res = await window.desktop!.scanRepo(repo.localPath);
      if (!res.ok) throw new Error(res.error ?? 'Scan failed');
      await api.saveRepoScan(repo.id, { scannedAt: Date.now(), robots: res.robots });
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
        {isDesktop && repo.localPath && (
          <button
            className="btn subtle"
            title="Open folder"
            onClick={() => window.desktop!.openPath(repo.localPath)}
          >
            📂
          </button>
        )}
        <span className="spacer" />
        {canEdit && (
          <>
            {isDesktop && repo.localPath && (
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
              onClick={() => {
                if (confirm(`Remove repo "${repo.name}"? (Doesn't touch the folder on disk.)`))
                  api.deleteRepo(repo.id);
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>

      {repo.localPath && <div className="repo-path muted">{repo.localPath}</div>}

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
            ? 'Not scanned yet — hit Scan to find robot folders and their last-modified dates.'
            : 'Not scanned yet — scanning reads your disk, so it runs from the desktop app.'}
        </div>
      )}

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
  const [name, setName] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.addRepo({
        name: name.trim(),
        localPath: localPath.trim(),
        remoteUrl: remoteUrl.trim(),
        private: isPrivate
      });
      setName('');
      setLocalPath('');
      setRemoteUrl('');
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="page wide">
      <div className="page-head">
        <h1>Repos</h1>
        <p className="muted">
          The git repos your mods live in. Scans (from the desktop app) list every robot folder
          with its last git modification date.
        </p>
      </div>
      {canEdit && (
        <form className="add-form" onSubmit={submit}>
          <input placeholder="Repo name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input
            className="grow"
            placeholder="Local path (e.g. C:\Users\Seb\Desktop\Private-Mods)"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
          />
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
