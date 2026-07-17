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
import { PillSelect } from '../components/PillSelect';
import { ProgressBar } from '../components/ProgressBar';
import { Splits, WhatsLeft } from '../components/Splits';
import { robotProgress } from '../steps';
import { useStore } from '../store/StoreContext';
import { MODTYPE_META, ModType, RobotStatus, STATUS_META } from '../types';

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
  const prog = robotProgress(robot);

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
          ) : isDesktop && repo.localPath ? (
            <button className="btn subtle" onClick={() => window.desktop!.openPath(repo.localPath)}>
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
          <input
            className="inline-edit"
            defaultValue={robot.game}
            key={`g-${robot.id}-${robot.game}`}
            readOnly={!canEdit}
            onBlur={(e) => {
              if (e.target.value !== robot.game) api.updateRobot(robot.id, { game: e.target.value.trim() });
            }}
          />
        </label>
        <label>
          Status
          <PillSelect
            value={robot.status}
            options={STATUS_OPTIONS}
            disabled={!canEdit}
            onChange={(v) => api.updateRobot(robot.id, { status: v as RobotStatus })}
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
          <select
            value={robot.modpackId ?? ''}
            disabled={!canEdit}
            onChange={(e) => api.setRobotModpack(robot.id, e.target.value || null)}
          >
            <option value="">No modpack</option>
            {modpacks.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.private ? ' 🔒' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Repo
          <select
            value={robot.repoId ?? ''}
            disabled={!canEdit}
            onChange={(e) => api.updateRobot(robot.id, { repoId: e.target.value || null })}
          >
            <option value="">No repo</option>
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.private ? ' 🔒' : ''}
              </option>
            ))}
          </select>
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
            onClick={() => {
              if (confirm(`Delete ${robot.name}? This can't be undone.`)) {
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
        <span className="muted">
          {prog.done}/{prog.total} sub-steps · {prog.stepsDone}/10 steps · {prog.pct}%
        </span>
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
