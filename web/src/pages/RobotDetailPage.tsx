// ---------------------------------------------------------------------------
// Robot detail — the LiveSplit-style splits view plus all robot settings
// (status, mod type, modpack, repo, privacy) and the AI script generator.
//
// Editing pattern used here: text inputs are "uncontrolled" (defaultValue) and
// save on blur (when you click away), so we don't hammer the store on every
// keystroke. Selects/checkboxes save immediately.
// ---------------------------------------------------------------------------
import { useNavigate, useParams } from 'react-router-dom';
import { AiScriptPanel } from '../components/AiScriptPanel';
import { useDialog } from '../components/Dialog';
import { PillSelect } from '../components/PillSelect';
import { Select } from '../components/Select';
import { ProgressBar } from '../components/ProgressBar';
import { Splits, WhatsLeft } from '../components/Splits';
import { getRepoPath } from '../lib/repoPaths';
import { STEPS, robotProgress } from '../steps';
import { useStore } from '../store/StoreContext';
import { GAMES, MODTYPE_META, ModType, RobotStatus, STATUS_META, StepProgress } from '../types';

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

export function RobotDetailPage() {
  const { id } = useParams<{ id: string }>(); // the :id part of /robot/:id
  const { robots, modpacks, repos, api, canEdit } = useStore();
  const { confirmDialog } = useDialog();
  const navigate = useNavigate();
  const robot = robots.find((r) => r.id === id);
  const isDesktop = !!window.desktop;

  if (!robot) {
    return (
      <div className="page">
        <div className="empty">Robot not found — it may be private (sign in) or was deleted.</div>
      </div>
    );
  }

  const repo = repos.find((r) => r.id === robot.repoId);
  const repoPath = repo ? getRepoPath(repo.id) : '';
  const prog = robotProgress(robot);

  const handleStatusChange = async (newStatus: string) => {
    const currentIdx = STATUS_ORDER.indexOf(robot.status);
    const newIdx = STATUS_ORDER.indexOf(newStatus as RobotStatus);
    if (newIdx > currentIdx) {
      // Upgrading status: mark all steps done so the tracker reflects reality
      const progress: Record<string, StepProgress> = {};
      for (const step of STEPS) {
        progress[step.id] = {
          subs: Object.fromEntries(step.subs.map((s) => [s.id, true])),
          note: robot.progress[step.id]?.note ?? '',
        };
      }
      await api.updateRobot(robot.id, { status: newStatus as RobotStatus, progress });
    } else {
      await api.updateRobot(robot.id, { status: newStatus as RobotStatus });
    }
  };

  return (
    <div className="page robot-detail">
      <div className="page-head">
        <button className="btn subtle" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>
          {robot.team && <span className="team-num big">{robot.team}</span>}
          {canEdit ? (
            <input
              className="inline-edit title-edit"
              defaultValue={robot.name}
              key={robot.id + robot.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== robot.name) api.updateRobot(robot.id, { name: v });
              }}
            />
          ) : (
            robot.name
          )}
        </h1>
        {/* Quick link to the repo this robot lives in */}
        {repo &&
          (repo.remoteUrl ? (
            <a className="repo-link" href={repo.remoteUrl} target="_blank" rel="noreferrer">
              {repo.name} ↗
            </a>
          ) : isDesktop && repoPath ? (
            <button className="btn subtle" onClick={() => window.desktop!.openPath(repoPath)}>
              📂 {repo.name}
            </button>
          ) : (
            <span className="muted">{repo.name}</span>
          ))}
      </div>

      <div className="detail-meta">
        <label>
          Team
          <input
            className="inline-edit"
            defaultValue={robot.team}
            key={`t-${robot.id}-${robot.team}`}
            readOnly={!canEdit}
            onBlur={(e) => {
              if (e.target.value !== robot.team) api.updateRobot(robot.id, { team: e.target.value.trim() });
            }}
          />
        </label>
        <label>
          Game
          <Select
            value={robot.game}
            disabled={!canEdit}
            options={GAMES.map((g) => ({ value: g, label: g }))}
            onChange={(nextGame) => {
              if (nextGame === robot.game) return;
              api.updateRobot(robot.id, { game: nextGame });
              const pack = modpacks.find((m) => m.id === robot.modpackId);
              if (pack && pack.game !== nextGame) api.setRobotModpack(robot.id, null);
            }}
          />
        </label>
        <label>
          Status
          <PillSelect
            value={robot.status}
            options={STATUS_OPTIONS}
            disabled={!canEdit}
            onChange={handleStatusChange}
          />
        </label>
        <label>
          Mod type
          <PillSelect
            value={robot.modType}
            options={MODTYPE_OPTIONS}
            disabled={!canEdit}
            allowEmpty="—"
            onChange={(v) => api.updateRobot(robot.id, { modType: v as ModType })}
          />
        </label>
        <label>
          Modpack
          <Select
            value={robot.modpackId ?? ''}
            disabled={!canEdit}
            options={[
              { value: '', label: 'No modpack' },
              ...modpacks
                .filter((m) => m.game === robot.game)
                .map((m) => ({ value: m.id, label: `${m.name}${m.private ? ' 🔒' : ''}` })),
            ]}
            onChange={(v) => api.setRobotModpack(robot.id, v || null)}
          />
        </label>
        <label>
          Repo
          <Select
            value={robot.repoId ?? ''}
            disabled={!canEdit}
            options={[
              { value: '', label: 'No repo' },
              ...repos.map((r) => ({ value: r.id, label: `${r.name}${r.private ? ' 🔒' : ''}` })),
            ]}
            onChange={(v) => api.updateRobot(robot.id, { repoId: v || null })}
          />
        </label>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={robot.private}
            disabled={!canEdit}
            onChange={(e) => api.updateRobot(robot.id, { private: e.target.checked })}
          />
          Private
        </label>
        {canEdit && (
          <button
            className="btn danger"
            onClick={async () => {
              if (await confirmDialog({
                title: 'Delete robot',
                message: `Delete ${robot.name}? This can't be undone.`,
              })) {
                api.deleteRobot(robot.id);
                navigate('/');
              }
            }}
          >
            Delete
          </button>
        )}
      </div>

      {robot.modpackPrivate && !robot.private && (
        <div className="banner info rounded">This robot is private because its modpack is private.</div>
      )}

      <div className="detail-progress">
        <ProgressBar pct={prog.pct} />
        {prog.pct < 100 && (
          <span className="muted">
            {prog.done}/{prog.total} sub-steps · {prog.stepsDone}/{STEPS.length} steps · {prog.pct}%
          </span>
        )}
      </div>

      <div className="detail-columns">
        <Splits robot={robot} editable={canEdit} />
        <div className="detail-side">
          <WhatsLeft robot={robot} />
          <div className="robot-notes">
            <h3>Robot notes</h3>
            <textarea
              key={`n-${robot.id}`}
              defaultValue={robot.notes}
              readOnly={!canEdit}
              placeholder={canEdit ? 'General notes for this robot…' : 'No notes'}
              onBlur={(e) => {
                if (e.target.value !== robot.notes) api.updateRobot(robot.id, { notes: e.target.value });
              }}
            />
          </div>
        </div>
      </div>

      {/* AI script generation — only useful for the owner, hidden for visitors */}
      {canEdit && <AiScriptPanel robot={robot} />}
    </div>
  );
}
