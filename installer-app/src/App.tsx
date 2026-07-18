import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import avatarUrl from '../../web/src/assets/avatar.png';

type Phase = 'welcome' | 'downloading' | 'installing' | 'done' | 'error';

interface ProgressPayload {
  phase: 'fetching' | 'downloading' | 'installing' | 'done' | 'error';
  downloaded?: number;
  total?: number;
  exe_path?: string;
  message?: string;
}

const STEPS = ['Welcome', 'Download', 'Install', 'Done'];

function stepIndex(phase: Phase): number {
  return { welcome: 0, downloading: 1, installing: 2, done: 3, error: 3 }[phase];
}

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [exePath, setExePath] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    listen<ProgressPayload>('install-progress', (e) => {
      if (cancelled) return;
      const p = e.payload;
      if (p.phase === 'fetching' || p.phase === 'downloading') {
        setPhase('downloading');
        setDownloaded(p.downloaded ?? 0);
        setTotal(p.total ?? 0);
      } else if (p.phase === 'installing') {
        setPhase('installing');
      } else if (p.phase === 'done') {
        setExePath(p.exe_path ?? '');
        setPhase('done');
      } else if (p.phase === 'error') {
        setErrorMsg(p.message ?? 'Unknown error');
        setPhase('error');
      }
    }).then((unlisten) => {
      unlistenRef.current = unlisten;
    });
    return () => {
      cancelled = true;
      unlistenRef.current?.();
    };
  }, []);

  async function startInstall() {
    setPhase('downloading');
    try {
      await invoke('start_install');
    } catch (e) {
      setErrorMsg(String(e));
      setPhase('error');
    }
  }

  async function launchApp() {
    try {
      await invoke('launch_app', { exePath });
      await invoke('close_window');
    } catch (e) {
      setErrorMsg(String(e));
      setPhase('error');
    }
  }

  const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
  const step = stepIndex(phase);

  return (
    <div className="root">
      {/* Drag region header */}
      <header className="header" data-tauri-drag-region>
        <div className="header-brand" data-tauri-drag-region>
          <img src={avatarUrl} alt="" className="avatar" />
          <span className="header-title" data-tauri-drag-region>MoSim Mod Tracker Setup</span>
        </div>
        <button className="close-btn" onClick={() => invoke('close_window')} title="Cancel">✕</button>
      </header>

      {/* Body */}
      <div className="body">
        {/* Step dots */}
        <div className="steps">
          {STEPS.map((label, i) => (
            <div key={label} className={`step-item ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              <div className="step-dot">{i < step ? '✓' : i + 1}</div>
              <span className="step-label">{label}</span>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="card">
          {phase === 'welcome' && (
            <div className="card-content">
              <img src={avatarUrl} alt="" className="card-avatar" />
              <h1 className="card-heading">Install MoSim Mod Tracker</h1>
              <p className="card-sub">
                Downloads and configures the latest release automatically.<br />
                Connects to <strong>mods.sebastianw.tech</strong>.
              </p>
              <button className="btn-primary" onClick={startInstall}>
                Install Now
              </button>
            </div>
          )}

          {phase === 'downloading' && (
            <div className="card-content">
              <div className="spinner-ring" />
              <h1 className="card-heading">Downloading…</h1>
              <p className="card-sub">{total > 0 ? `${formatBytes(downloaded)} / ${formatBytes(total)}` : 'Fetching release info…'}</p>
              {total > 0 && (
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              )}
              <p className="card-pct">{total > 0 ? `${pct}%` : ''}</p>
            </div>
          )}

          {phase === 'installing' && (
            <div className="card-content">
              <div className="spinner-ring" />
              <h1 className="card-heading">Installing…</h1>
              <p className="card-sub">This will only take a moment.</p>
            </div>
          )}

          {phase === 'done' && (
            <div className="card-content">
              <div className="checkmark">✓</div>
              <h1 className="card-heading">All done!</h1>
              <p className="card-sub">MoSim Mod Tracker is installed and ready.</p>
              <button className="btn-primary" onClick={launchApp}>
                Launch Now
              </button>
            </div>
          )}

          {phase === 'error' && (
            <div className="card-content">
              <div className="error-icon">✕</div>
              <h1 className="card-heading">Something went wrong</h1>
              <p className="card-sub error-text">{errorMsg}</p>
              <button className="btn-primary" onClick={() => setPhase('welcome')}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
