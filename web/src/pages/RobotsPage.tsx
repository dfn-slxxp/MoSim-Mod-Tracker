import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PillSelect } from '../components/PillSelect';
import { ProgressBar } from '../components/ProgressBar';
import { RobotForm } from '../components/RobotForm';
import { Select } from '../components/Select';
import { STEPS, robotProgress, stepProgress } from '../steps';
import { useStore } from '../store/StoreContext';
import { GAMES, MODTYPE_META, ModType, Robot, RobotStatus, STATUS_META } from '../types';

type Tab = 'in-progress' | 'all';
type SortKey = 'team' | 'game' | 'progress' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER: RobotStatus[] = ['planned', 'in-unity', 'semi-functional', 'released'];

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

function currentStep(robot: Robot): string | null {
  for (const step of STEPS) {
    if (!stepProgress(robot, step).complete) return step.title;
  }
  return null;
}

const PROGRESS_FILTERS = [
  { value: '', label: 'Any progress' },
  { value: 'none', label: 'No progress (0%)' },
  { value: 'some', label: 'Started (1–49%)' },
  { value: 'half', label: 'Halfway+ (≥50%)' },
  { value: 'almost', label: 'Almost done (≥75%)' },
  { value: 'done', label: 'Complete (100%)' }
];

function matchesProgress(pct: number, filter: string): boolean {
  switch (filter) {
    case 'none':   return pct === 0;
    case 'some':   return pct > 0 && pct < 50;
    case 'half':   return pct >= 50;
    case 'almost': return pct >= 75;
    case 'done':   return pct === 100;
    default:       return true;
  }
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
        {robot.teamName ?? robot.name}
        {(robot.private || robot.modpackPrivate) && (
          <span className="lock" title="Private">
            {' '}🔒
          </span>
        )}
      </td>
      <td className="col-game" data-label="Game">{robot.game}</td>
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

  const [tab, setTab] = useState<Tab>('in-progress');
  const [filterGame, setFilterGame] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProgress, setFilterProgress] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('team');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const YEARS = [...new Set(GAMES.map((g) => g.split(':')[0].trim()))];

  // "In progress" = status moved past planned OR any sub-step checked
  // (a planned robot you started checking boxes on is being worked on).
  const isInProgress = (r: Robot) => r.status !== 'planned' || robotProgress(r).done > 0;

  // Base set by tab
  const base = tab === 'in-progress' ? robots.filter(isInProgress) : robots;

  // Apply filters
  let shown = base;
  if (filterGame) shown = shown.filter((r) => r.game === filterGame);
  if (filterYear) shown = shown.filter((r) => r.game.startsWith(filterYear));
  if (filterStatus) shown = shown.filter((r) => r.status === filterStatus);
  if (filterProgress) shown = shown.filter((r) => matchesProgress(robotProgress(r).pct, filterProgress));
  if (teamSearch.trim()) {
    const q = teamSearch.toLowerCase();
    shown = shown.filter(
      (r) => r.team.includes(teamSearch.trim()) ||
             (r.teamName ?? r.name).toLowerCase().includes(q)
    );
  }

  // Sort
  const dir = sortDir === 'asc' ? 1 : -1;
  shown = [...shown].sort((a, b) => {
    switch (sortBy) {
      // parseInt ignores rebuild suffixes ("9483a" -> 9483); tie-break on the
      // full string so 9483a sorts before 9483b.
      case 'team':      return dir * ((parseInt(a.team || '0') - parseInt(b.team || '0')) || a.team.localeCompare(b.team));
      case 'game':      return dir * a.game.localeCompare(b.game);
      case 'progress':  return dir * (robotProgress(a).pct - robotProgress(b).pct);
      case 'status':    return dir * (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
      case 'createdAt': return dir * (a.createdAt - b.createdAt);
      default:          return 0;
    }
  });

  const inProgressCount = robots.filter(isInProgress).length;

  return (
    <div className="page wide">
      <div className="page-head">
        <h1>Robots</h1>
        <p className="muted">Click a row to open its splits and progress tracker.</p>
      </div>

      <RobotForm />

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === 'in-progress' ? 'active' : ''}`}
          onClick={() => { setTab('in-progress'); setFilterStatus(''); }}
        >
          In Progress ({inProgressCount})
        </button>
        <button
          className={`tab-btn ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          All ({robots.length})
        </button>
      </div>

      {/* Filter + sort bar */}
      <div className="filter-bar">
        <Select
          value={filterGame}
          options={[{ value: '', label: 'All games' }, ...GAMES.map((g) => ({ value: g, label: g }))]}
          onChange={setFilterGame}
        />

        <Select
          value={filterYear}
          options={[{ value: '', label: 'All years' }, ...YEARS.map((y) => ({ value: y, label: y }))]}
          onChange={setFilterYear}
        />

        {tab === 'all' && (
          <Select
            value={filterStatus}
            options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
            onChange={setFilterStatus}
          />
        )}

        <Select value={filterProgress} options={PROGRESS_FILTERS} onChange={setFilterProgress} />

        <input
          className="filter-search"
          placeholder="Team # or name…"
          value={teamSearch}
          onChange={(e) => setTeamSearch(e.target.value)}
        />

        <div className="sort-controls">
          <Select
            title="Sort by"
            value={sortBy}
            options={[
              { value: 'team', label: 'Team #' },
              { value: 'game', label: 'Game' },
              { value: 'progress', label: 'Progress' },
              { value: 'status', label: 'Status' },
              { value: 'createdAt', label: 'Date added' },
            ]}
            onChange={(v) => setSortBy(v as SortKey)}
          />
          <button
            type="button"
            className="sort-dir-btn"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          {robots.length === 0
            ? 'No robots yet — add your first one above.'
            : 'No robots match the current filters.'}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="tracker-table">
            <thead>
              <tr>
                <th>Team #</th>
                <th>Team Name</th>
                <th>Game</th>
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
