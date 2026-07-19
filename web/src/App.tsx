// ---------------------------------------------------------------------------
// Top-level component: routing + the page shell (top bar, nav, banners).
// /compact renders WITHOUT the shell — that's the LiveSplit-style overlay.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import avatarUrl from './assets/avatar.png';
import { AuthButton } from './components/AuthButton';
import { AdminPage } from './pages/AdminPage';
import { CompactPage } from './pages/CompactPage';
import { ModpacksPage } from './pages/ModpacksPage';
import { PlannedPage } from './pages/PlannedPage';
import { ReposPage } from './pages/ReposPage';
import { RobotDetailPage } from './pages/RobotDetailPage';
import { RobotsPage } from './pages/RobotsPage';
import { ScriptsPage } from './pages/ScriptsPage';
import { useStore } from './store/StoreContext';
import { useTheme } from './theme';

/** Desktop-only: toggle always-on-top. Grayscale = unpinned, accent = pinned. */
function PinButton() {
  const [pinned, setPinned] = useState(true);
  useEffect(() => {
    window.desktop?.isPinned().then(setPinned);
  }, []);
  return (
    <button
      className={`btn subtle theme-btn pin-btn ${pinned ? 'active' : ''}`}
      title={pinned ? 'Pinned on top (click to unpin)' : 'Not pinned (click to pin on top)'}
      onClick={async () => setPinned((await window.desktop!.togglePin()) ?? !pinned)}
    >
      📌
    </button>
  );
}

function ThemeButton() {
  const { theme, setTheme, allThemes } = useTheme();
  const idx = Math.max(0, allThemes.findIndex((t) => t.id === theme));
  const next = allThemes[(idx + 1) % allThemes.length];
  const current = allThemes[idx];
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
        <div
          className="app-titlebar"
          data-tauri-drag-region
          onMouseDown={(e) => {
            // Buttons must stay clickable; empty titlebar space drags the window.
            if (e.button !== 0) return;
            if ((e.target as HTMLElement).closest('button, select, input')) return;
            void window.desktop?.startDragging();
          }}
        >
          <img className="titlebar-mark" src={avatarUrl} alt="" data-tauri-drag-region />
          <span className="titlebar-name" data-tauri-drag-region>MoSim Mod Tracker</span>
          <PinButton />
          <button
            className="btn subtle theme-btn"
            title="Switch to compact splits view"
            onClick={async () => {
              await window.desktop?.setExpanded(false);
              navigate('/compact');
            }}
          >
            ▣
          </button>
          <ThemeButton />
          <div className="win-controls">
            <button className="win-btn" title="Minimize" onClick={() => window.desktop?.minimize()}>─</button>
            <button className="win-btn" title="Maximize" onClick={() => window.desktop?.toggleMaximize()}>▢</button>
            <button className="win-btn close" title="Close" onClick={() => window.desktop?.close()}>✕</button>
          </div>
        </div>
      )}
      <header className="topbar">
        <div className="brand">
          <img className="brand-mark" src={avatarUrl} alt="" />
          <span className="brand-name">MoSim Mod Tracker</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>Robots</NavLink>
          <NavLink to="/modpacks">Modpacks</NavLink>
          <NavLink to="/repos">Repos</NavLink>
          <NavLink to="/scripts">Scripts</NavLink>
          {!isDesktop && <NavLink to="/compact">Compact</NavLink>}
        </nav>
        {!isDesktop && (
          <div className="topbar-actions">
            <ThemeButton />
          </div>
        )}
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
              <Route path="/admin" element={<AdminPage />} />
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
