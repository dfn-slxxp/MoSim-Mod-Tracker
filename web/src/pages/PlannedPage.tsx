// ---------------------------------------------------------------------------
// Planned page — robots you intend to make + the modpack they'd ship in.
// "Start modding" flips the status to Claimed and opens the splits view.
// ---------------------------------------------------------------------------
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../components/Dialog';
import { RobotForm } from '../components/RobotForm';
import { useStore } from '../store/StoreContext';

export function PlannedPage() {
  const { robots, modpacks, api, canEdit } = useStore();
  const { confirmDialog } = useDialog();
  const navigate = useNavigate();
  const planned = robots.filter((r) => r.status === 'planned');

  return (
    <div className="page">
      <div className="page-head">
        <h1>Planned robots</h1>
        <p className="muted">
          Robots you intend to make and the modpacks they'd ship in. Hit “Start modding” when you begin.
        </p>
      </div>
      <RobotForm />
      {planned.length === 0 && <div className="empty">Nothing planned yet.</div>}
      <div className="planned-list">
        {planned.map((r) => {
          const pack = modpacks.find((m) => m.id === r.modpackId);
          return (
            <div key={r.id} className="planned-row">
              <div className="planned-main">
                <span className="robot-name">
                  {r.team && <span className="team-num">{r.team}</span>}
                  {r.name}
                  {(r.private || r.modpackPrivate) && <span className="lock"> 🔒</span>}
                </span>
                <span className="muted">{r.game}</span>
                {canEdit ? (
                  <select
                    value={r.modpackId ?? ''}
                    onChange={(e) => api.setRobotModpack(r.id, e.target.value || null)}
                  >
                    <option value="">No modpack</option>
                    {modpacks.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.private ? ' 🔒' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="pack-chip">{pack ? pack.name : 'No modpack'}</span>
                )}
              </div>
              <textarea
                key={`pn-${r.id}`}
                className="planned-notes"
                placeholder={canEdit ? 'Why / what to remember about this robot…' : 'No notes'}
                defaultValue={r.notes}
                readOnly={!canEdit}
                onBlur={(e) => {
                  if (e.target.value !== r.notes) api.updateRobot(r.id, { notes: e.target.value });
                }}
              />
              {canEdit && (
                <div className="planned-actions">
                  <button
                    className="btn primary"
                    onClick={async () => {
                      await api.updateRobot(r.id, { status: 'in-unity' });
                      navigate(`/robot/${r.id}`);
                    }}
                  >
                    Start modding →
                  </button>
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={r.private}
                      onChange={(e) => api.updateRobot(r.id, { private: e.target.checked })}
                    />
                    Private
                  </label>
                  <button
                    className="btn danger subtle"
                    onClick={async () => {
                      if (await confirmDialog({ title: 'Delete plan', message: `Delete plan for ${r.name}?` }))
                        api.deleteRobot(r.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
