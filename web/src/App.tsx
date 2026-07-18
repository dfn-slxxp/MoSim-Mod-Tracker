// ---------------------------------------------------------------------------
// Top-level component: routing + the page shell (top bar, nav, banners).
// /compact renders WITHOUT the shell — that's the LiveSplit-style overlay.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import avatarUrl from './assets/avatar.png';
import { AuthButton } from './components/AuthButton';
import { CompactPage } from './pages/CompactPage';
import { ModpacksPage } from './pages/ModpacksPage';
import { PlannedPage } from './pages/PlannedPage';
import { ReposPage } from './pages/ReposPage';
import { RobotDetailPage } from './pages/RobotDetailPage';
import { RobotsPage } from './pages/RobotsPage';
import { ScriptsPage } from './pages/ScriptsPage';
import { useStore } from './store/StoreContext';
import { THEMES, useTheme } from './theme';

function ThemeButton() {
  const { theme, setTheme } = useTheme();
  const idx = THEMES.findIndex((t) => t.id === theme);
  const next = THEMES[(idx + 1) % THEMES.length];
  const current = THEMES[idx];
  return (
    <button
      className="btn subtle theme-btn"
      title={`Theme: ${current.label} (click for ${next.label})`}
      onClick={() => setTheme(next.id)}
    >
      {current.icon}
    </button>
  );
}

/** Full-page sign-in prompt shown when the app is ready but no user is signed in. */
function SignInGate() {
  const { api } = useStore();
  return (
    <div className="signin-gate">
      <div className="signin-card">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 12 }}>
          <img className="brand-mark" src={avatarUrl} alt="" style={{ width: 48, height: 48 }} />
          <span className="brand-name">MoSim Mod Tracker</span>
        </div>
        <p className="muted" style={{ margin: '0 0 20px', textAlign: 'center' }}>
          Sign in with your Google account to access your mod tracker.
        </p>
        <button
          className="btn primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => api.signIn()}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { ready, error, user } = useStore();
  const navigate = useNavigate();
  const isDesktop = !!window.desktop;

  return (
    <div className={`shell ${isDesktop ? 'is-desktop' : ''}`}>
      {isDesktop && (
        <div className="desktop-titlebar">
          <span className="drag-region">MoSim Mod Tracker</span>
          <button
            className="titlebar-btn"
            title="Switch to compact splits view"
            onClick={async () => {
              await window.desktop?.setExpanded(false);
              navigate('/compact');
            }}
          >
            ▣
          </button>
          <button className="titlebar-btn danger" title="Close" onClick={() => window.desktop?.close()}>
            ✕
          </button>
        </div>
      )}
      <header className="topbar">
        <div className="brand">
          <img className="brand-mark" src={avatarUrl} alt="" />
          <span className="brand-name">MoSim Mod Tracker</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>Robots</NavLink>
          <NavLink to="/planned">Planned</NavLink>
          <NavLink to="/modpacks">Modpacks</NavLink>
          <NavLink to="/repos">Repos</NavLink>
          <NavLink to="/scripts">Scripts</NavLink>
          <NavLink to="/compact">Compact</NavLink>
        </nav>
        <ThemeButton />
        <AuthButton />
      </header>
      {error && <div className="banner error">{error}</div>}
      <main className="content">
        {!ready ? (
          <div className="loading">Loading…</div>
        ) : !user ? (
          <SignInGate />
        ) : (
          children
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/compact" element={<CompactPage />} />
      <Route
        path="*"
        element={
          <Shell>
            <Routes>
              <Route path="/" element={<RobotsPage />} />
              <Route path="/robot/:id" element={<RobotDetailPage />} />
              <Route path="/planned" element={<PlannedPage />} />
              <Route path="/modpacks" element={<ModpacksPage />} />
              <Route path="/repos" element={<ReposPage />} />
              <Route path="/scripts" element={<ScriptsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Shell>
        }
      />
    </Routes>
  );
}
