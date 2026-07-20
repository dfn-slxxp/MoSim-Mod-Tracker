// ---------------------------------------------------------------------------
// Public landing page (/home, and / on the web). Explains MoSim + modding and
// showcases the community: every user who has at least one public robot and
// hasn't been hidden by an admin. No auth required to view.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import avatarUrl from '../assets/avatar.png';
import { isTauri, getServerUrl } from '../lib/desktop';
import { useStore } from '../store/StoreContext';
import type { CommunityUser } from '../types';

function igHandle(v: string): string {
  return v.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '');
}

function CommunityCard({ u }: { u: CommunityUser }) {
  const ig = igHandle(u.instagram);
  return (
    <Link className="community-card" to={`/u/${u.uid}`}>
      <div className="community-top">
        {u.photo ? (
          <img className="community-photo" src={u.photo} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="community-photo placeholder">{u.displayName.charAt(0).toUpperCase()}</div>
        )}
        <div className="community-id">
          <span className="community-name">{u.displayName}</span>
          <span className="muted small">
            {u.robotCount} public mod{u.robotCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      {u.games.length > 0 && (
        <div className="community-games">
          {u.games.map((g) => (
            <span key={g} className="game-chip">{g}</span>
          ))}
        </div>
      )}
      {(ig || u.discord) && (
        <div className="community-links">
          {ig && (
            <a
              className="social-link ig"
              href={`https://instagram.com/${ig}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Instagram
            </a>
          )}
          {u.discord && <span className="social-link discord" title="Discord username">@{u.discord}</span>}
        </div>
      )}
      <span className="community-view">View mods →</span>
    </Link>
  );
}

export function HomePage() {
  const { user, api } = useStore();
  const [users, setUsers] = useState<CommunityUser[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const base = isTauri() ? await getServerUrl() : '';
        const res = await fetch(`${base}/api/community`);
        if (!res.ok) return;
        const body = (await res.json()) as { users: CommunityUser[] };
        setUsers(body.users ?? []);
      } catch {
        setUsers([]);
      }
    })();
  }, []);

  return (
    <div className="home">
      {/* Hero */}
      <section className="home-hero">
        <img className="home-mark" src={avatarUrl} alt="" />
        <h1 className="home-title">MoSim Mod Tracker</h1>
        <p className="home-tagline">
          Bring real FRC robots into MoSim — and track every build from idea to release.
        </p>
        {!user ? (
          <button className="btn primary home-cta" onClick={() => api.signIn()}>
            Sign in with Google to start
          </button>
        ) : (
          <a className="btn primary home-cta" href="#/robots">Open your tracker →</a>
        )}
      </section>

      {/* What it is */}
      <section className="home-section">
        <div className="home-cols">
          <div className="home-block">
            <h2>What is MoSim?</h2>
            <p>
              MoSim is a Unity-based simulator for FIRST Robotics Competition. It lets you drive,
              test, and practice with FRC robots on a physically accurate field — no shop, no
              hardware, no downtime between competitions.
            </p>
          </div>
          <div className="home-block">
            <h2>What does modding do?</h2>
            <p>
              A mod recreates a specific team’s robot — its mechanisms, controls, and scoring —
              inside MoSim. Every mod adds another real machine to the field, so drivers can
              scrimmage against the robots they actually face and teams can prototype ideas long
              before metal is cut.
            </p>
          </div>
        </div>
      </section>

      {/* How the tracker helps */}
      <section className="home-section">
        <h2 className="home-section-title">A LiveSplit-style tracker for the build</h2>
        <div className="home-steps">
          <div className="home-step">
            <span className="home-step-num">1</span>
            <span>Add a team robot and pull its name straight from The Blue Alliance.</span>
          </div>
          <div className="home-step">
            <span className="home-step-num">2</span>
            <span>Work a shared checklist — model prep, code, tuning, ship — with progress saved.</span>
          </div>
          <div className="home-step">
            <span className="home-step-num">3</span>
            <span>Keep a compact overlay on top while you mod, LiveSplit style.</span>
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="home-section">
        <h2 className="home-section-title">Modders in the community</h2>
        {users === null ? (
          <div className="muted" style={{ textAlign: 'center', padding: 20 }}>Loading community…</div>
        ) : users.length === 0 ? (
          <div className="empty">No public robots yet — be the first to share one.</div>
        ) : (
          <div className="community-grid">
            {users.map((u) => (
              <CommunityCard key={u.uid} u={u} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
