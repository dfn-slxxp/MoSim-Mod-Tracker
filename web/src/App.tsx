// ---------------------------------------------------------------------------
// Top-level component: routing + the page shell (top bar, nav, banners).
// The /compact route renders WITHOUT the shell — that's the LiveSplit-style
// overlay used by the desktop app.
// ---------------------------------------------------------------------------
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
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

/** Cycles dark -> light -> cloud on click. */
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

function Shell({ children }: { children: React.ReactNode }) {
  const { mode, ready, error } = useStore();
  const navigate = useNavigate();
  const isDesktop = !!window.desktop;

  return (
    // `is-desktop` lets CSS tighten things up so the app feels less like a website.
    <div className={`shell ${isDesktop ? 'is-desktop' : ''}`}>
      {isDesktop && (
        // Frameless window = we draw our own title bar; the drag-region CSS
        // property is what lets you move the window with it.
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
          <span className="brand-mark">M</span>
          <span className="brand-name">MoSim Mod Tracker</span>
          <span className={`mode-badge ${mode}`}>{mode === 'local' ? 'Local' : 'Cloud'}</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Robots
          </NavLink>
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
      {mode === 'local' && ready && (
        <div className="banner info">
          Local mode — data lives on this device only. Add your Firebase config to enable sync,
          Google sign-in and private robots (see README).
        </div>
      )}
      <main className="content">{ready ? children : <div className="loading">Loading…</div>}</main>
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
