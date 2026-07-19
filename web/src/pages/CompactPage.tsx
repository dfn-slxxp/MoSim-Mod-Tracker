// ---------------------------------------------------------------------------
// Compact page — the LiveSplit-style overlay column. This is what the desktop
// app shows by default (always-on-top). It also works in a normal browser at
// /#/compact. The selected robot is remembered per device.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../components/Dialog';
import { ProgressBar } from '../components/ProgressBar';
import { Select } from '../components/Select';
import { Splits } from '../components/Splits';
import { STEPS, robotProgress, stepProgress } from '../steps';
import { useStore } from '../store/StoreContext';
import { STATUS_META, type Robot } from '../types';

const LAST_ROBOT_KEY = 'mosim-compact-robot';
const VIEW_MODE_KEY = 'mosim-compact-view';

const WORKING = new Set(['in-unity', 'semi-functional']);

/**
 * LiveSplit-style run view: the current step plus two before and two after.
 * The current step is the first with unchecked sub-steps; a quick-check
 * button ticks its next sub-step without leaving the overlay.
 */
function RunView({ robot, editable }: { robot: Robot; editable: boolean }) {
  const { api } = useStore();
  const infos = STEPS.map((step) => ({ step, sp: stepProgress(robot, step) }));
  let cur = infos.findIndex((i) => !i.sp.complete);
  const finished = cur === -1;
  if (finished) cur = infos.length - 1;
  const start = Math.max(0, Math.min(cur - 2, Math.max(0, STEPS.length - 5)));
  const visible = infos.slice(start, start + 5);
  const current = infos[cur];
  const nextSub = current.step.subs.find((s) => !robot.progress[current.step.id]?.subs?.[s.id]);

  const checkNext = () => {
    if (!editable || !nextSub) return;
    const existing = robot.progress[current.step.id];
    const sp = { subs: { ...(existing?.subs ?? {}) }, note: existing?.note ?? '' };
    sp.subs[nextSub.id] = true;
    api.updateRobot(robot.id, { progress: { ...robot.progress, [current.step.id]: sp } });
  };

  return (
    <div className="run-view">
      {visible.map(({ step, sp }, vi) => {
        const idx = start + vi;
        const state = finished || idx < cur ? 'done' : idx === cur ? 'current' : 'upcoming';
        return (
          <div key={step.id} className={`run-row ${state}`}>
            <span className="run-index">{idx + 1}</span>
            <span className="run-title">{step.title}</span>
            <span className="run-count">{sp.complete ? '✓' : `${sp.done}/${sp.total}`}</span>
          </div>
        );
      })}
      {finished ? (
        <div className="run-next all-done">Run complete 🎉</div>
      ) : (
        <div className="run-next">
          <div className="run-next-text">
            <span className="run-next-eyebrow">Next</span>
            <span className="run-next-label">{nextSub?.label ?? '—'}</span>
          </div>
          {editable && nextSub && (
            <button className="btn primary run-check" title="Check this sub-step" onClick={checkNext}>
              ✓
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CompactPage() {
  const { robots, user, api, canEdit, ready } = useStore();
  const { alertDialog } = useDialog();
  const navigate = useNavigate();
  const isDesktop = !!window.desktop;
  const [pinned, setPinned] = useState(true);
  const [runMode, setRunMode] = useState(() => localStorage.getItem(VIEW_MODE_KEY) === 'run');
  const [selectedId, setSelectedId] = useState<string>(() => localStorage.getItem(LAST_ROBOT_KEY) ?? '');

  const toggleRunMode = () =>
    setRunMode((m) => {
      const next = !m;
      localStorage.setItem(VIEW_MODE_KEY, next ? 'run' : 'full');
      return next;
    });

  useEffect(() => {
    window.desktop?.isPinned().then(setPinned);
  }, []);

  const active = robots.filter((r) => WORKING.has(r.status));
  const others = robots.filter((r) => !WORKING.has(r.status));
  const robot = robots.find((r) => r.id === selectedId) ?? active[0] ?? robots[0] ?? null;

  useEffect(() => {
    if (robot && robot.id !== selectedId) setSelectedId(robot.id);
    if (robot) localStorage.setItem(LAST_ROBOT_KEY, robot.id);
  }, [robot?.id]);

  const prog = robot ? robotProgress(robot) : null;

  return (
    <div className="compact-shell">
      <div
        className="compact-titlebar"
        data-tauri-drag-region
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest('button, select, input')) return;
          void window.desktop?.startDragging();
        }}
      >
        <span className="drag-region compact-brand" data-tauri-drag-region>MoSim Tracker</span>
        <button
          className={`titlebar-btn ${runMode ? 'active' : ''}`}
          title={runMode ? 'Run mode: current step ±2 (click for full list)' : 'Switch to run mode (current step ±2)'}
          onClick={toggleRunMode}
        >
          🏁
        </button>
        {isDesktop ? (
          <>
            <button
              className={`titlebar-btn pin-btn ${pinned ? 'active' : ''}`}
              title={pinned ? 'Unpin (allow other windows on top)' : 'Pin on top'}
              onClick={async () => setPinned((await window.desktop!.togglePin()) ?? !pinned)}
            >
              📌
            </button>
            <button
              className="titlebar-btn"
              title="Expand to full view"
              onClick={async () => {
                await window.desktop!.setExpanded(true);
                navigate('/');
              }}
            >
              ⛶
            </button>
            <button className="titlebar-btn danger" title="Close" onClick={() => window.desktop!.close()}>
              ✕
            </button>
          </>
        ) : (
          <button className="titlebar-btn" title="Full view" onClick={() => navigate('/')}>
            ⛶
          </button>
        )}
      </div>

      {!ready ? (
        <div className="loading">Loading…</div>
      ) : (
        <>
          {!user && (
            <button className="btn primary compact-signin" onClick={() => api.signIn().catch((e) => void alertDialog((e as Error).message, 'Sign-in failed'))}>
              Sign in with Google
            </button>
          )}
          {robots.length === 0 ? (
            <div className="empty compact-empty">
              No robots yet.
              <button className="btn subtle" onClick={() => navigate('/')}>
                Open full view to add one
              </button>
            </div>
          ) : (
            <>
              <Select
                className="compact-select"
                value={robot?.id ?? ''}
                options={[
                  ...active.map((r) => ({
                    value: r.id,
                    label: `${r.team ? `${r.team} ` : ''}${r.name}`,
                    group: 'In progress',
                  })),
                  ...others.map((r) => ({
                    value: r.id,
                    label: `${r.team ? `${r.team} ` : ''}${r.name} (${STATUS_META[r.status].label})`,
                    group: 'Other',
                  })),
                ]}
                onChange={setSelectedId}
              />
              {robot && prog && (
                <>
                  <div className="compact-progress">
                    <ProgressBar pct={prog.pct} small />
                    <span>
                      {prog.done}/{prog.total} · {prog.pct}%
                    </span>
                  </div>
                  <div className="compact-splits">
                    {runMode ? (
                      <RunView robot={robot} editable={canEdit} />
                    ) : (
                      <Splits robot={robot} editable={canEdit} compact />
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
