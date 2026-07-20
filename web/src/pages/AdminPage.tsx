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
import { useEffect, useState } from 'react';
import { useDialog } from '../components/Dialog';
import { generateTheme } from '../lib/color';
import { isTauri, getServerUrl } from '../lib/desktop';
import { STEPS, Step, applySteps } from '../steps';
import { useStore } from '../store/StoreContext';
import { BUILTIN_THEMES, useTheme } from '../theme';
import type { AdminUser, CustomTheme } from '../types';

// ── Small authenticated fetch helpers (cookie on web, Bearer on desktop) ────
async function adminReq(method: string, path: string, body?: unknown): Promise<unknown> {
  const base = isTauri() ? await getServerUrl() : '';
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  const token = localStorage.getItem('mosim_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json().catch(() => ({}));
}
const adminPut = (path: string, body: unknown) => adminReq('PUT', path, body).then(() => {});

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
  const { confirmDialog } = useDialog();
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
              onClick={async () => {
                if (await confirmDialog({ title: 'Delete step', message: `Delete step "${step.title}" and its sub-steps?` }))
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

/** Sensible starting colors for a new theme. */
const DEFAULTS = { primary: '#3fb950', secondary: '#58a6ff' };

function ThemesEditor() {
  const { confirmDialog } = useDialog();
  const { customThemes, setCustomThemes, setTheme, colorMode, setColorMode } = useTheme();
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

  /** Regenerate preview vars from the editor colors + a color mode. */
  const regen = (t: CustomTheme, mode: 'dark' | 'light' = colorMode): void => {
    const primary = t.primary ?? DEFAULTS.primary;
    const secondary = t.secondary ?? DEFAULTS.secondary;
    t.primary = primary; t.secondary = secondary;
    t.vars = generateTheme(primary, secondary, mode);
  };

  const addTheme = () => {
    mutate((d) => {
      const taken = new Set([...BUILTIN_THEMES.map((t) => t.id), ...d.map((t) => t.id)]);
      const t: CustomTheme = {
        id: uniqueId('custom-theme', taken),
        label: 'My theme',
        icon: '🎨',
        primary: DEFAULTS.primary,
        secondary: DEFAULTS.secondary,
        mode: colorMode,
        vars: {},
      };
      regen(t);
      d.push(t);
    });
  };

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const cleaned = themes.map((t) => {
        const out = { ...t, id: t.id.startsWith('custom-') ? t.id : `custom-${slug(t.id)}` };
        regen(out, colorMode); // snapshot for legacy clients; runtime inject regenerates both modes
        return out;
      });
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
        Pick a primary and secondary color — the rest of the palette (surfaces, text, borders,
        gradients, status colors) is generated for both dark and light mode. Use the 🌙/☀️ button
        in the titlebar to preview each brightness. Themes sync to every device and appear on the
        theme button.
      </p>
      {msg && <div className="muted small admin-msg">{msg}</div>}

      {themes.map((t, ti) => {
        const primary = t.primary ?? DEFAULTS.primary;
        const secondary = t.secondary ?? DEFAULTS.secondary;
        const vars = t.vars && Object.keys(t.vars).length
          ? t.vars
          : generateTheme(primary, secondary, colorMode);
        return (
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
              <button className="btn subtle" onClick={() => { mutate((d) => regen(d[ti])); setTheme(t.id); }}>
                Preview
              </button>
              <button
                className="btn danger subtle"
                onClick={async () => {
                  if (await confirmDialog({ title: 'Delete theme', message: `Delete theme "${t.label}"?` }))
                    mutate((d) => { d.splice(ti, 1); });
                }}
              >Delete</button>
            </div>

            <div className="theme-inputs">
              <label className="admin-var">
                Primary color
                <span className="admin-color-pair">
                  <input type="color" value={primary}
                    onChange={(e) => mutate((d) => { d[ti].primary = e.target.value; regen(d[ti]); })} />
                  <input value={primary}
                    onChange={(e) => mutate((d) => { d[ti].primary = e.target.value; regen(d[ti]); })} />
                </span>
              </label>
              <label className="admin-var">
                Secondary color
                <span className="admin-color-pair">
                  <input type="color" value={secondary}
                    onChange={(e) => mutate((d) => { d[ti].secondary = e.target.value; regen(d[ti]); })} />
                  <input value={secondary}
                    onChange={(e) => mutate((d) => { d[ti].secondary = e.target.value; regen(d[ti]); })} />
                </span>
              </label>
              <label className="admin-var">
                Preview brightness
                <div className="btn-row">
                  <button type="button" className={`toggle-btn ${colorMode === 'dark' ? 'on' : ''}`}
                    onClick={() => { setColorMode('dark'); mutate((d) => regen(d[ti], 'dark')); }}>🌙 Dark</button>
                  <button type="button" className={`toggle-btn ${colorMode === 'light' ? 'on' : ''}`}
                    onClick={() => { setColorMode('light'); mutate((d) => regen(d[ti], 'light')); }}>☀️ Light</button>
                </div>
              </label>
            </div>

            {/* Live swatch preview of the generated palette */}
            <div className="theme-preview" style={{ background: vars.bg, borderColor: vars['border-solid'] }}>
              <div className="theme-preview-card" style={{ background: vars.panel, borderColor: vars['border-solid'] }}>
                <span style={{ color: vars.text, fontWeight: 600 }}>{t.label || 'Preview'}</span>
                <span style={{ color: vars.muted, fontSize: 12 }}>muted text</span>
                <div className="theme-swatches">
                  {['accent', 'blue', 'gold', 'red'].map((k) => (
                    <span key={k} className="theme-swatch" style={{ background: vars[k] }} title={k} />
                  ))}
                  <span className="theme-chip" style={{ background: vars['pill-semi-bg'], color: vars['pill-semi-fg'] }}>Released</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="btn-row">
        <button className="btn" onClick={addTheme}>+ New theme</button>
      </div>
    </section>
  );
}

// ── Community users editor ────────────────────────────────────────────────────

function UsersEditor() {
  const { alertDialog } = useDialog();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    adminReq('GET', '/api/admin/users')
      .then((r) => setUsers((r as { users: AdminUser[] }).users ?? []))
      .catch(() => setUsers([]));
  };
  useEffect(load, []);

  const toggle = async (u: AdminUser) => {
    setBusy(u.uid);
    try {
      await adminPut(`/api/admin/users/${u.uid}/visibility`, { hidden: !u.hidden });
      setUsers((prev) => prev?.map((x) => (x.uid === u.uid ? { ...x, hidden: !x.hidden } : x)) ?? null);
    } catch (e) {
      void alertDialog((e as Error).message, 'Could not update visibility');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>Community directory</h2>
        <button className="btn subtle" onClick={load}>Refresh</button>
      </div>
      <p className="muted small">
        Everyone who has signed in. Hidden users never appear on the public home page, even with
        public robots. Users with no public robots don’t appear regardless.
      </p>
      {users === null ? (
        <div className="muted small">Loading…</div>
      ) : users.length === 0 ? (
        <div className="muted small">No users yet.</div>
      ) : (
        <div className="admin-users">
          {users.map((u) => (
            <div key={u.uid} className={`admin-user ${u.hidden ? 'hidden' : ''}`}>
              {u.photo ? (
                <img className="admin-user-photo" src={u.photo} alt="" referrerPolicy="no-referrer" />
              ) : (
                <div className="admin-user-photo placeholder">{u.displayName.charAt(0).toUpperCase()}</div>
              )}
              <div className="admin-user-id">
                <span className="admin-user-name">{u.displayName}</span>
                <span className="muted small">{u.email}</span>
              </div>
              <span className="muted small admin-user-count">
                {u.publicRobotCount} public · {u.robotCount} total
              </span>
              <button
                className={`toggle-btn ${u.hidden ? '' : 'on'}`}
                disabled={busy === u.uid}
                onClick={() => toggle(u)}
              >
                {u.hidden ? '🚫 Hidden' : '✓ Visible'}
              </button>
            </div>
          ))}
        </div>
      )}
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
      <UsersEditor />
      <StepsEditor />
      <ThemesEditor />
    </div>
  );
}
