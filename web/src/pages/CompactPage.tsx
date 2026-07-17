// ---------------------------------------------------------------------------
// Compact page — the LiveSplit-style overlay column. This is what the desktop
// app shows by default (always-on-top). It also works in a normal browser at
// /#/compact. The selected robot is remembered per device.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import { Splits } from '../components/Splits';
import { robotProgress } from '../steps';
import { useStore } from '../store/StoreContext';
import { STATUS_META } from '../types';

const LAST_ROBOT_KEY = 'mosim-compact-robot';

/** Statuses that count as "being worked on" for the top of the picker. */
const WORKING = new Set(['claimed', 'in-unity', 'semi-functional']);

export function CompactPage() {
  const { robots, mode, user, api, canEdit, ready } = useStore();
  const navigate = useNavigate();
  const isDesktop = !!window.desktop;
  const [pinned, setPinned] = useState(true);
  const [selectedId, setSelectedId] = useState<string>(() => localStorage.getItem(LAST_ROBOT_KEY) ?? '');

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
      <div className="compact-titlebar">
        <span className="drag-region compact-brand">MoSim Tracker</span>
        {isDesktop ? (
          <>
            <button
              className={`titlebar-btn ${pinned ? 'active' : ''}`}
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
          {mode === 'cloud' && !user && (
            <button className="btn primary compact-signin" onClick={() => api.signIn().catch((e) => alert(e.message))}>
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
              <select
                className="compact-select"
                value={robot?.id ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {active.length > 0 && (
                  <optgroup label="In progress">
                    {active.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.team ? `${r.team} ` : ''}
                        {r.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {others.length > 0 && (
                  <optgroup label="Other">
                    {others.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.team ? `${r.team} ` : ''}
                        {r.name} ({STATUS_META[r.status].label})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {robot && prog && (
                <>
                  <div className="compact-progress">
                    <ProgressBar pct={prog.pct} small />
                    <span>
                      {prog.done}/{prog.total} · {prog.pct}%
                    </span>
                  </div>
                  <div className="compact-splits">
                    <Splits robot={robot} editable={canEdit} compact />
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
