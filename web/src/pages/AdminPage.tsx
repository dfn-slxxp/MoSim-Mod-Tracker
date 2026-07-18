// ---------------------------------------------------------------------------
// Admin dashboard (/admin — deliberately NOT in the navbar). Access is gated
// by the server's ADMIN_EMAILS allowlist (user.admin from /api/me).
//
// Two tools:
//   1. Steps editor  — add/remove/rename workflow steps + sub-steps. Saved
//      server-side; every client loads it on startup (loadRemoteSteps).
//   2. Themes editor — build custom CSS-variable themes stored server-side,
//      usable on all devices exactly like the built-in dark/light/cloud.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { isTauri, getServerUrl } from '../lib/desktop';
import { STEPS, Step, applySteps } from '../steps';
import { useStore } from '../store/StoreContext';
import { BUILTIN_THEMES, useTheme } from '../theme';
import type { CustomTheme } from '../types';

// ── Small authenticated fetch helper (cookie on web, Bearer on desktop) ─────
async function adminPut(path: string, body: unknown): Promise<void> {
  const base = isTauri() ? await getServerUrl() : '';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const token = localStorage.getItem('mosim_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function uniqueId(base: string, taken: Set<string>): string {
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

// ── Steps editor ─────────────────────────────────────────────────────────────

function StepsEditor() {
  const [steps, setSteps] = useState<Step[]>(() => JSON.parse(JSON.stringify(STEPS)));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const mutate = (fn: (draft: Step[]) => void) => {
    setSteps((prev) => {
      const draft: Step[] = JSON.parse(JSON.stringify(prev));
      fn(draft);
      return draft;
    });
  };

  const stepIds = new Set(steps.map((s) => s.id));

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await adminPut('/api/admin/steps', { steps });
      applySteps(steps);
      setMsg('Saved. All devices pick this up on next load.');
    } catch (e) {
      setMsg(`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>Workflow steps</h2>
        <button className="btn primary" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save steps'}
        </button>
      </div>
      <p className="muted small">
        Renaming a label keeps existing progress. Deleting a step or sub-step drops its saved
        checkmarks on every robot. New items start unchecked everywhere.
      </p>
      {msg && <div className="muted small admin-msg">{msg}</div>}

      {steps.map((step, si) => (
        <div key={step.id} className="admin-step">
          <div className="admin-step-head">
            <span className="split-index">{si + 1}</span>
            <input
              value={step.title}
              onChange={(e) => mutate((d) => { d[si].title = e.target.value; })}
            />
            <input
              className="admin-docurl"
              placeholder="Docs URL (optional)"
              value={step.docUrl ?? ''}
              onChange={(e) => mutate((d) => { d[si].docUrl = e.target.value || undefined; })}
            />
            <button
              className="btn subtle"
              title="Move up"
              disabled={si === 0}
              onClick={() => mutate((d) => { [d[si - 1], d[si]] = [d[si], d[si - 1]]; })}
            >↑</button>
            <button
              className="btn subtle"
              title="Move down"
              disabled={si === steps.length - 1}
              onClick={() => mutate((d) => { [d[si], d[si + 1]] = [d[si + 1], d[si]]; })}
            >↓</button>
            <button
              className="btn danger subtle"
              onClick={() => {
                if (confirm(`Delete step "${step.title}" and its sub-steps?`))
                  mutate((d) => { d.splice(si, 1); });
              }}
            >Delete</button>
          </div>
          <div className="admin-subs">
            {step.subs.map((sub, bi) => (
              <div key={sub.id} className="admin-sub-row">
                <input
                  value={sub.label}
                  onChange={(e) => mutate((d) => { d[si].subs[bi].label = e.target.value; })}
                />
                <button
                  className="btn danger subtle"
                  onClick={() => mutate((d) => { d[si].subs.splice(bi, 1); })}
                >✕</button>
              </div>
            ))}
            <button
              className="btn subtle"
              onClick={() =>
                mutate((d) => {
                  const taken = new Set(d[si].subs.map((s) => s.id));
                  d[si].subs.push({ id: uniqueId(`sub-${d[si].subs.length + 1}`, taken), label: 'New sub-step' });
                })
              }
            >+ Sub-step</button>
          </div>
        </div>
      ))}

      <button
        className="btn"
        onClick={() =>
          mutate((d) => {
            d.push({ id: uniqueId(slug('new-step'), stepIds), title: 'New step', subs: [] });
          })
        }
      >+ Add step</button>
    </section>
  );
}

// ── Themes editor ────────────────────────────────────────────────────────────

/** Curated variable list exposed in the editor (label + whether it's a color). */
const THEME_VARS: { key: string; label: string; color: boolean }[] = [
  { key: 'bg', label: 'Background', color: true },
  { key: 'panel', label: 'Panel', color: true },
  { key: 'border-solid', label: 'Border', color: true },
  { key: 'text', label: 'Text', color: true },
  { key: 'muted', label: 'Muted text', color: true },
  { key: 'accent', label: 'Accent', color: true },
  { key: 'titlebar', label: 'Titlebar', color: true },
  { key: 'gold', label: 'Gold', color: true },
  { key: 'red', label: 'Red', color: true },
  { key: 'blue', label: 'Blue', color: true },
  { key: 'radius', label: 'Corner radius', color: false }
];

/** Base variable sets to start a new theme from (mirrors styles.css). */
const BASES: Record<string, Record<string, string>> = {
  dark: {
    bg: '#0b0e14', panel: '#141a24', 'border-solid': '#263042', text: '#e6e9ef',
    muted: '#8b95a7', accent: '#3fb950', titlebar: '#0a0d12',
    gold: '#d4a72c', red: '#f85149', blue: '#58a6ff', radius: '8px',
    'accent-dim': '#2ea04326', shadow: 'none', 'bg-image': 'none'
  },
  light: {
    bg: '#f4f6f9', panel: '#ffffff', 'border-solid': '#d5dce6', text: '#1c2430',
    muted: '#66707f', accent: '#218739', titlebar: '#e6eaf0',
    gold: '#b58a17', red: '#d1332e', blue: '#2f6fd0', radius: '8px',
    'accent-dim': '#21873916', shadow: '0 1px 3px rgba(20, 30, 50, 0.08)', 'bg-image': 'none'
  }
};

function ThemesEditor() {
  const { customThemes, setCustomThemes, setTheme } = useTheme();
  const [themes, setThemes] = useState<CustomTheme[]>(() => JSON.parse(JSON.stringify(customThemes)));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const mutate = (fn: (draft: CustomTheme[]) => void) => {
    setThemes((prev) => {
      const draft: CustomTheme[] = JSON.parse(JSON.stringify(prev));
      fn(draft);
      return draft;
    });
  };

  const addTheme = (base: 'dark' | 'light') => {
    mutate((d) => {
      const taken = new Set([...BUILTIN_THEMES.map((t) => t.id), ...d.map((t) => t.id)]);
      d.push({
        id: uniqueId('custom-theme', taken),
        label: 'My theme',
        icon: '🎨',
        // Derived accent-dim etc. update automatically when accent changes on save.
        vars: { ...BASES[base] }
      });
    });
  };

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      // Keep accent-dim in sync with accent (used for subtle backgrounds).
      const cleaned = themes.map((t) => ({
        ...t,
        id: t.id.startsWith('custom-') ? t.id : `custom-${slug(t.id)}`,
        vars: { ...t.vars, 'accent-dim': `${t.vars.accent ?? '#3fb950'}26` }
      }));
      await adminPut('/api/admin/themes', { themes: cleaned });
      setCustomThemes(cleaned);
      setThemes(cleaned);
      setMsg('Saved. Themes are live on all devices.');
    } catch (e) {
      setMsg(`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>Custom themes</h2>
        <button className="btn primary" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save themes'}
        </button>
      </div>
      <p className="muted small">
        Themes are stored on the server and appear in the theme cycle button on every device.
        Start from a dark or light base, then adjust the colors.
      </p>
      {msg && <div className="muted small admin-msg">{msg}</div>}

      {themes.map((t, ti) => (
        <div key={t.id} className="admin-theme">
          <div className="admin-theme-head">
            <input
              className="admin-theme-icon"
              value={t.icon}
              maxLength={4}
              onChange={(e) => mutate((d) => { d[ti].icon = e.target.value; })}
            />
            <input
              value={t.label}
              onChange={(e) => mutate((d) => { d[ti].label = e.target.value; })}
            />
            <button className="btn subtle" onClick={() => setTheme(t.id)}>Preview</button>
            <button
              className="btn danger subtle"
              onClick={() => {
                if (confirm(`Delete theme "${t.label}"?`)) mutate((d) => { d.splice(ti, 1); });
              }}
            >Delete</button>
          </div>
          <div className="admin-theme-vars">
            {THEME_VARS.map((v) => (
              <label key={v.key} className="admin-var">
                {v.label}
                {v.color ? (
                  <span className="admin-color-pair">
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(t.vars[v.key] ?? '') ? t.vars[v.key] : '#000000'}
                      onChange={(e) => mutate((d) => { d[ti].vars[v.key] = e.target.value; })}
                    />
                    <input
                      value={t.vars[v.key] ?? ''}
                      onChange={(e) => mutate((d) => { d[ti].vars[v.key] = e.target.value; })}
                    />
                  </span>
                ) : (
                  <input
                    value={t.vars[v.key] ?? ''}
                    onChange={(e) => mutate((d) => { d[ti].vars[v.key] = e.target.value; })}
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="btn-row">
        <button className="btn" onClick={() => addTheme('dark')}>+ New from dark base</button>
        <button className="btn" onClick={() => addTheme('light')}>+ New from light base</button>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function AdminPage() {
  const { user, ready } = useStore();

  if (!ready) return <div className="loading">Loading…</div>;
  if (!user?.admin) {
    return (
      <div className="page">
        <div className="empty">Admin access only. This account is not on the allowlist.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Admin dashboard</h1>
        <p className="muted">
          Global settings that apply to every user and device. Not linked in the navbar; the URL
          is <code>/#/admin</code>.
        </p>
      </div>
      <StepsEditor />
      <ThemesEditor />
    </div>
  );
}
