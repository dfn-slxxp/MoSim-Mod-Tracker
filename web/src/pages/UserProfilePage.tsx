// ---------------------------------------------------------------------------
// Public user profile (/u/:uid) — reached by clicking a member on the home
// page. Shows the user's public info and a read-only list of their public
// mods. No auth required.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import { isTauri, getServerUrl } from '../lib/desktop';
import { robotProgress } from '../steps';
import { STATUS_META, type PublicProfile, type CommunityRobot, type Robot } from '../types';

function igHandle(v: string): string {
  return v.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '');
}

function ModRow({ r }: { r: CommunityRobot }) {
  const prog = robotProgress(r as unknown as Robot);
  const meta = STATUS_META[r.status];
  return (
    <tr>
      <td className="col-team">{r.team}</td>
      <td className="col-name">{r.teamName ?? r.name}</td>
      <td className="col-game" data-label="Game">{r.game}</td>
      <td data-label="Status">
        {meta && <span className={`pill ${meta.className}`}>{meta.label}</span>}
      </td>
      <td className="col-progress" data-label="Progress">
        <div className="cell-progress">
          <ProgressBar pct={prog.pct} small />
          {prog.pct < 100 && <span className="muted">{prog.pct}%</span>}
        </div>
      </td>
    </tr>
  );
}

export function UserProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const [data, setData] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound'>('loading');
  const [copied, setCopied] = useState(false);

  // The embeddable share URL is the clean (non-hash) /u/:uid path the server
  // renders social previews for. On desktop, point at the public web origin.
  const shareLink = async () => {
    const base = isTauri() ? await getServerUrl() : window.location.origin;
    const url = `${base}/u/${encodeURIComponent(uid ?? '')}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = isTauri() ? await getServerUrl() : '';
        const res = await fetch(`${base}/api/community/${encodeURIComponent(uid ?? '')}`);
        if (cancelled) return;
        if (!res.ok) { setState('notfound'); return; }
        setData((await res.json()) as PublicProfile);
        setState('ok');
      } catch {
        if (!cancelled) setState('notfound');
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  if (state === 'loading') return <div className="loading">Loading…</div>;

  if (state === 'notfound' || !data) {
    return (
      <div className="page">
        <Link className="btn subtle" to="/home">← Back to community</Link>
        <div className="empty">This modder has no public mods, or the profile doesn’t exist.</div>
      </div>
    );
  }

  const { user, robots } = data;
  const ig = igHandle(user.instagram);

  return (
    <div className="page">
      <div className="page-actions">
        <Link className="btn subtle" to="/home">← Back to community</Link>
        <span className="spacer" />
        <button className="btn subtle" onClick={shareLink}>
          {copied ? '✓ Link copied' : '🔗 Share'}
        </button>
      </div>

      <div className="profile-header">
        {user.photo ? (
          <img className="profile-photo" src={user.photo} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="profile-photo placeholder">{user.displayName.charAt(0).toUpperCase()}</div>
        )}
        <div className="profile-meta">
          <h1 className="profile-name">{user.displayName}</h1>
          <span className="muted">{robots.length} public mod{robots.length === 1 ? '' : 's'}</span>
          {(ig || user.discord) && (
            <div className="community-links" style={{ marginTop: 4 }}>
              {ig && (
                <a className="social-link ig" href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer">
                  Instagram
                </a>
              )}
              {user.discord && <span className="social-link discord" title="Discord username">@{user.discord}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table className="tracker-table">
          <thead>
            <tr>
              <th>Team #</th>
              <th>Team Name</th>
              <th>Game</th>
              <th>Status</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {robots.map((r) => <ModRow key={r.id} r={r} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
