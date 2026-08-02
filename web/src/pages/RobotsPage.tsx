import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PillSelect } from '../components/PillSelect';
import { ProgressBar } from '../components/ProgressBar';
import { RobotForm } from '../components/RobotForm';
import { Select } from '../components/Select';
import { STEPS, robotProgress, stepProgress } from '../steps';
import { useStore } from '../store/StoreContext';
import { GAMES, Robot, RobotStatus, STATUS_META, StepProgress } from '../types';

type Tab = 'in-progress' | 'all';
type SortKey = 'year' | 'team' | 'progress' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER: RobotStatus[] = ['planned', 'in-unity', 'semi-functional', 'released'];

// Rotating color families for the Game column/heading — reuses the same pill
// hues status/mod-type pills use, keyed by a game's position in GAMES (falls
// back to a stable hash for games no longer in that list).
const GAME_COLOR_CLASSES = ['gm-released', 'gm-planned', 'gm-semi', 'gm-official', 'gm-claimed'];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function gameClassName(game: string): string {
  const idx = (GAMES as readonly string[]).indexOf(game);
  const i = idx === -1 ? Math.abs(hashCode(game)) : idx;
  return GAME_COLOR_CLASSES[i % GAME_COLOR_CLASSES.length];
}

/** Splits "2025: Reefscape" into a year + title so they can be spaced apart. */
function gameParts(game: string): { year: string; title: string } {
  const idx = game.indexOf(':');
  if (idx === -1) return { year: game, title: '' };
  return { year: game.slice(0, idx).trim(), title: game.slice(idx + 1).trim() };
}

function yearOfGame(game: string): number {
  return parseInt(game, 10) || 0;
}

function currentStepId(robot: Robot): string | null {
  for (const step of STEPS) {
    if (!stepProgress(robot, step).complete) return step.id;
  }
  return null;
}

function currentStepTitle(robot: Robot): string | null {
  for (const step of STEPS) {
    if (!stepProgress(robot, step).complete) return step.title;
  }
  return null;
}

/**
 * Status derived from progress: 0% = Planned, 100% = Released, anything in
 * between = In Unity. Semi-Functional can't be derived from checkmarks (it's
 * a judgment call about playability), so it's the one manual/sticky value.
 */
function deriveStatus(robot: Robot, pct: number): RobotStatus {
  if (robot.status === 'semi-functional') return 'semi-functional';
  if (pct <= 0) return 'planned';
  if (pct >= 100) return 'released';
  return 'in-unity';
}

function statusOptions(robot: Robot) {
  const onFirstStep = currentStepId(robot) === STEPS[0]?.id;
  return STATUS_ORDER.map((s) => ({
    value: s,
    label: s === 'in-unity' && onFirstStep ? 'Simplifying Model' : STATUS_META[s].label,
    className: STATUS_META[s].className
  }));
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

function compareTeams(a: Robot, b: Robot): number {
  // parseInt ignores rebuild suffixes ("9483a" -> 9483); tie-break on the
  // full string so 9483a sorts before 9483b.
  return (parseInt(a.team || '0') - parseInt(b.team || '0')) || a.team.localeCompare(b.team);
}

function gameYear(robot: Robot): number {
  return yearOfGame(robot.game);
}

function RobotRow({ robot }: { robot: Robot }) {
  const { modpacks, repos, api, canEdit } = useStore();
  const navigate = useNavigate();
  const pack = modpacks.find((m) => m.id === robot.modpackId);
  const repo = repos.find((r) => r.id === robot.repoId);
  const prog = robotProgress(robot);
  const step = currentStepTitle(robot);
  const derived = deriveStatus(robot, prog.pct);

  // Keep the stored status in sync with progress made elsewhere (e.g. the
  // splits view), so status stays accurate without a manual visit here.
  useEffect(() => {
    if (canEdit && derived !== robot.status) {
      api.updateRobot(robot.id, { status: derived });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robot.id, robot.status, prog.pct, canEdit]);

  const handleStatusChange = async (v: string) => {
    const newStatus = v as RobotStatus;
    if (newStatus === 'semi-functional') {
      await api.updateRobot(robot.id, { status: 'semi-functional' });
      return;
    }
    if (newStatus === 'planned') {
      const progress: Record<string, StepProgress> = {};
      for (const s of STEPS) progress[s.id] = { subs: {}, note: robot.progress[s.id]?.note ?? '' };
      await api.updateRobot(robot.id, { status: 'planned', progress });
      return;
    }
    if (newStatus === 'released') {
      const progress: Record<string, StepProgress> = {};
      for (const s of STEPS) {
        progress[s.id] = {
          subs: Object.fromEntries(s.subs.map((sub) => [sub.id, true])),
          note: robot.progress[s.id]?.note ?? ''
        };
      }
      await api.updateRobot(robot.id, { status: 'released', progress });
      return;
    }
    // in-unity: nudge off 0% so it doesn't immediately re-derive back to Planned
    if (prog.pct === 0) {
      const first = STEPS[0];
      const firstSub = first?.subs[0];
      if (first && firstSub) {
        const progress = {
          ...robot.progress,
          [first.id]: {
            subs: { ...(robot.progress[first.id]?.subs ?? {}), [firstSub.id]: true },
            note: robot.progress[first.id]?.note ?? ''
          }
        };
        await api.updateRobot(robot.id, { status: 'in-unity', progress });
        return;
      }
    }
    await api.updateRobot(robot.id, { status: 'in-unity' });
  };

  const { year, title } = gameParts(robot.game);

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
      <td className="col-game" data-label="Game">
        <span className={`game-pill ${gameClassName(robot.game)}`}>
          <span className="game-year">{year}</span>
          {title && <span className="game-title">{title}</span>}
        </span>
      </td>
      <td className="col-pack" data-label="Modpack">
        {pack ? pack.name : <span className="muted">—</span>}
      </td>
      <td className="col-repo" data-label="Repo">
        {repo ? (
          repo.remoteUrl ? (
            <a
              className="btn subtle repo-btn"
              href={repo.remoteUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {repo.name} ↗
            </a>
          ) : (
            <span className="muted">{repo.name}</span>
          )
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td className="col-progress" data-label="Progress">
        <div className="cell-progress">
          <ProgressBar pct={prog.pct} small />
          {prog.pct < 100 && <span className="muted">{prog.pct}%</span>}
          <PillSelect
            value={robot.status}
            options={statusOptions(robot)}
            disabled={!canEdit}
            hideChevron
            onChange={handleStatusChange}
          />
        </div>
        {robot.status === 'in-unity' && step && <div className="step-hint">→ {step}</div>}
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
  const [sortBy, setSortBy] = useState<SortKey>('year');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const YEARS = [...new Set(GAMES.map((g) => g.split(':')[0].trim()))];

  const STATUS_OPTIONS = (Object.keys(STATUS_META) as RobotStatus[]).map((s) => ({
    value: s,
    label: STATUS_META[s].label,
    className: STATUS_META[s].className
  }));

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
      case 'year':      return dir * (gameYear(a) - gameYear(b)) || compareTeams(a, b);
      case 'team':      return dir * compareTeams(a, b);
      case 'progress':  return dir * (robotProgress(a).pct - robotProgress(b).pct);
      case 'status':    return dir * (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
      case 'createdAt': return dir * (a.createdAt - b.createdAt);
      default:          return 0;
    }
  });

  // Group into one table per game. Group order follows the year sort when
  // that's the active sort key, otherwise defaults to newest-first.
  const gameOrder = [...new Set(shown.map((r) => r.game))].sort((a, b) =>
    sortBy === 'year' ? dir * (yearOfGame(a) - yearOfGame(b)) : yearOfGame(b) - yearOfGame(a)
  );

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
              { value: 'year', label: 'Year' },
              { value: 'team', label: 'Team #' },
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
        gameOrder.map((game) => {
          const rows = shown.filter((r) => r.game === game);
          const { year, title } = gameParts(game);
          return (
            <div key={game} className="game-table-group">
              <h2 className={`game-table-heading ${gameClassName(game)}`}>
                <span className="game-year">{year}</span>
                {title && <span className="game-title">{title}</span>}
              </h2>
              <div className="table-wrap">
                <table className="tracker-table">
                  <thead>
                    <tr>
                      <th>Team #</th>
                      <th>Team Name</th>
                      <th>Game</th>
                      <th>Modpack</th>
                      <th>Repo</th>
                      <th>Progress</th>
                      <th>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <RobotRow key={r.id} robot={r} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
