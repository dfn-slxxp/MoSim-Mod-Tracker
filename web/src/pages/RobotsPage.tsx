// ---------------------------------------------------------------------------
// Robots page — a spreadsheet-style table like the community MoSim tracker:
// colored status / mod-type pill dropdowns, comments inline, no search bar.
// Filter chips narrow by status. Clicking a row opens the robot's splits.
// On phones the table collapses into stacked cards (pure CSS, see styles).
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PillSelect } from '../components/PillSelect';
import { ProgressBar } from '../components/ProgressBar';
import { RobotForm } from '../components/RobotForm';
import { STEPS, robotProgress, stepProgress } from '../steps';
import { useStore } from '../store/StoreContext';
import { MODTYPE_META, ModType, Robot, RobotStatus, STATUS_META } from '../types';

const STATUS_OPTIONS = (Object.keys(STATUS_META) as RobotStatus[]).map((s) => ({
  value: s,
  label: STATUS_META[s].label,
  className: STATUS_META[s].className
}));

const MODTYPE_OPTIONS = (Object.keys(MODTYPE_META) as Exclude<ModType, ''>[]).map((m) => ({
  value: m,
  label: MODTYPE_META[m].label,
  className: MODTYPE_META[m].className
}));

/** First step that isn't finished — the "give details" part of In Unity. */
function currentStep(robot: Robot): string | null {
  for (const step of STEPS) {
    if (!stepProgress(robot, step).complete) return step.title;
  }
  return null;
}

function RobotRow({ robot }: { robot: Robot }) {
  const { modpacks, repos, api, canEdit } = useStore();
  const navigate = useNavigate();
  const pack = modpacks.find((m) => m.id === robot.modpackId);
  const repo = repos.find((r) => r.id === robot.repoId);
  const prog = robotProgress(robot);
  const step = currentStep(robot);

  return (
    <tr className="robot-row" onClick={() => navigate(`/robot/${robot.id}`)}>
      <td className="col-team">{robot.team}</td>
      <td className="col-name">
        {robot.name}
        {(robot.private || robot.modpackPrivate) && (
          <span className="lock" title="Private — requires sign-in to view">
            {' '}
            🔒
          </span>
        )}
      </td>
      <td className="col-status" data-label="Status">
        <PillSelect
          value={robot.status}
          options={STATUS_OPTIONS}
          disabled={!canEdit}
          onChange={(v) => api.updateRobot(robot.id, { status: v as RobotStatus })}
        />
        {robot.status === 'in-unity' && step && <div className="step-hint">→ {step}</div>}
      </td>
      <td className="col-modtype" data-label="Mod type">
        <PillSelect
          value={robot.modType}
          options={MODTYPE_OPTIONS}
          disabled={!canEdit}
          allowEmpty="—"
          onChange={(v) => api.updateRobot(robot.id, { modType: v as ModType })}
        />
      </td>
      <td className="col-pack" data-label="Modpack">
        {pack ? pack.name : <span className="muted">—</span>}
      </td>
      <td className="col-repo" data-label="Repo">
        {repo ? repo.name : <span className="muted">—</span>}
      </td>
      <td className="col-progress" data-label="Progress">
        <div className="cell-progress">
          <ProgressBar pct={prog.pct} small />
          <span className="muted">{prog.pct}%</span>
        </div>
      </td>
      <td className="col-comments" data-label="Comments">
        <span className="comment-preview">{robot.notes || ''}</span>
      </td>
    </tr>
  );
}

export function RobotsPage() {
  const { robots } = useStore();
  const [filter, setFilter] = useState<RobotStatus | 'all'>('all');

  // Everything except planned (those get their own page).
  const tracked = robots.filter((r) => r.status !== 'planned');
  const shown = filter === 'all' ? tracked : tracked.filter((r) => r.status === filter);
  const counts = (s: RobotStatus) => tracked.filter((r) => r.status === s).length;

  return (
    <div className="page wide">
      <div className="page-head">
        <h1>Robots</h1>
        <p className="muted">Mods you're working on. Click a row to open its splits.</p>
      </div>
      <RobotForm status="in-unity" />

      <div className="filter-chips">
        <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
          All ({tracked.length})
        </button>
        {STATUS_OPTIONS.filter((o) => o.value !== 'planned').map((o) => (
          <button
            key={o.value}
            className={`chip ${o.className} ${filter === o.value ? 'on' : ''}`}
            onClick={() => setFilter(o.value as RobotStatus)}
          >
            {o.label} ({counts(o.value as RobotStatus)})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty">No robots here yet — add your first mod above.</div>
      ) : (
        <div className="table-wrap">
          <table className="tracker-table">
            <thead>
              <tr>
                <th>Team #</th>
                <th>Name</th>
                <th>Status</th>
                <th>Mod Type</th>
                <th>Modpack</th>
                <th>Repo</th>
                <th>Progress</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <RobotRow key={r.id} robot={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
