// ---------------------------------------------------------------------------
// Modpacks page — the packs robots ship in. Marking a pack private cascades
// to its member robots (see setModpackPrivacy in the backends for how).
// ---------------------------------------------------------------------------
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext';

export function ModpacksPage() {
  const { modpacks, robots, api, canEdit } = useStore();
  const [name, setName] = useState('');
  const [game, setGame] = useState('Reefscape');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.addModpack({
        name: name.trim(),
        game: game.trim() || 'Reefscape',
        description: description.trim(),
        private: isPrivate
      });
      setName('');
      setDescription('');
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Modpacks</h1>
        <p className="muted">
          Packs your robots ship in. Marking a pack private hides it and every robot inside it.
        </p>
      </div>
      {canEdit && (
        <form className="add-form" onSubmit={submit}>
          <input placeholder="Pack name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="Game" value={game} onChange={(e) => setGame(e.target.value)} />
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="inline-check">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            Private
          </label>
          <button className="btn primary" type="submit">
            Add modpack
          </button>
        </form>
      )}
      {modpacks.length === 0 && <div className="empty">No modpacks yet.</div>}
      <div className="pack-list">
        {modpacks.map((m) => {
          const members = robots.filter((r) => r.modpackId === m.id);
          return (
            <div key={m.id} className="pack-row">
              <div className="pack-main">
                <span className="pack-name">
                  {m.name}
                  {m.private && <span className="lock"> 🔒</span>}
                </span>
                <span className="muted">{m.game}</span>
                {m.description && <span className="pack-desc">{m.description}</span>}
              </div>
              <div className="pack-robots">
                {members.length === 0 && <span className="muted">No robots</span>}
                {members.map((r) => (
                  <Link key={r.id} to={`/robot/${r.id}`} className="pack-chip link">
                    {r.team ? `${r.team} ` : ''}
                    {r.name}
                    {r.status === 'planned' ? ' (planned)' : ''}
                  </Link>
                ))}
              </div>
              {canEdit && (
                <div className="pack-actions">
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={m.private}
                      onChange={(e) => api.setModpackPrivacy(m.id, e.target.checked)}
                    />
                    Private
                  </label>
                  <button
                    className="btn danger subtle"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete modpack "${m.name}"? Robots inside it are kept but detached.`
                        )
                      ) {
                        api.deleteModpack(m.id);
                      }
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
