// ---------------------------------------------------------------------------
// Top-level component: routing + the page shell (top bar, nav, banners).
// /compact renders WITHOUT the shell — that's the LiveSplit-style overlay.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import avatarUrl from './assets/avatar.png';
import { AuthButton } from './components/AuthButton';
import { ProfileForm } from './components/ProfileForm';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { CompactPage } from './pages/CompactPage';
import { HomePage } from './pages/HomePage';
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
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const idx = Math.max(0, allThemes.findIndex((t) => t.id === theme));
  const next = allThemes[(idx + 1) % allThemes.length];
  const current = allThemes[idx];

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    // Anchor to the button's right edge so the menu doesn't run off-screen.
    setMenu({ top: r.bottom + 6, left: Math.max(6, r.right - 190) });
  };

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    const close = () => setMenu(null);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  return (
    <>
      <button
        ref={btnRef}
        className="btn subtle theme-btn"
        title={`Theme: ${current.label} — click to cycle (${next.label}), right-click to choose`}
        onClick={() => setTheme(next.id)}
        onContextMenu={(e) => { e.preventDefault(); menu ? setMenu(null) : openMenu(); }}
      >
        {current.icon}
      </button>
      {menu &&
        createPortal(
          <div ref={menuRef} className="dd-menu theme-menu" style={{ top: menu.top, left: menu.left, minWidth: 190 }}>
            <div className="dd-group">Theme</div>
            {allThemes.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`dd-option ${t.id === theme ? 'selected' : ''}`}
                onClick={() => { setTheme(t.id); setMenu(null); }}
              >
                <span className="theme-menu-icon">{t.icon}</span>
                <span className="dd-option-label">{t.label}</span>
                {t.id === theme && <span className="dd-tick">✓</span>}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
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

/** First-time profile setup: modal shown once after sign-in until saved. */
function ProfileSetup() {
  return (
    <div className="dialog-overlay">
      <div className="dialog-card profile-setup-card" role="dialog" aria-modal="true">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 6 }}>
          <img className="brand-mark" src={avatarUrl} alt="" style={{ width: 40, height: 40 }} />
        </div>
        <h2 className="dialog-title" style={{ textAlign: 'center' }}>Welcome — set up your profile</h2>
        <p className="dialog-message" style={{ textAlign: 'center' }}>
          This is how you’ll appear in the community directory. You can change it any time on the
          Account page.
        </p>
        <ProfileForm saveLabel="Save & continue" />
      </div>
    </div>
  );
}

/** Wraps pages that require sign-in. Also drives the first-time profile setup. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, user } = useStore();
  if (!ready) return <div className="loading">Loading…</div>;
  if (!user) return <SignInGate />;
  return <>{children}</>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { error, user } = useStore();
  const navigate = useNavigate();
  const isDesktop = !!window.desktop;
  const needsSetup = !!user && user.profile?.completed === false;

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
          <NavLink to="/home">Home</NavLink>
          <NavLink to="/robots">Robots</NavLink>
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
      <main className="content">{children}</main>
      {needsSetup && <ProfileSetup />}
    </div>
  );
}

export default function App() {
  const isDesktop = !!window.desktop;
  return (
    <Routes>
      <Route path="/compact" element={<CompactPage />} />
      <Route
        path="*"
        element={
          <Shell>
            <Routes>
              {/* Desktop opens straight to the tracker; web to the public home. */}
              <Route path="/" element={<Navigate to={isDesktop ? '/robots' : '/home'} replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/robots" element={<RequireAuth><RobotsPage /></RequireAuth>} />
              <Route path="/robot/:id" element={<RequireAuth><RobotDetailPage /></RequireAuth>} />
              <Route path="/planned" element={<RequireAuth><PlannedPage /></RequireAuth>} />
              <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
              <Route path="/modpacks" element={<RequireAuth><ModpacksPage /></RequireAuth>} />
              <Route path="/repos" element={<RequireAuth><ReposPage /></RequireAuth>} />
              <Route path="/scripts" element={<RequireAuth><ScriptsPage /></RequireAuth>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Shell>
        }
      />
    </Routes>
  );
}
