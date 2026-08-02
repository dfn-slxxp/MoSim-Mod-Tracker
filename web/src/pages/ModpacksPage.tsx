import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDialog } from '../components/Dialog';
import { Select } from '../components/Select';
import { useStore } from '../store/StoreContext';
import { GAMES } from '../types';

export function ModpacksPage() {
  const { modpacks, robots, api, canEdit } = useStore();
  const { confirmDialog, alertDialog } = useDialog();
  const [name, setName] = useState('');
  const [game, setGame] = useState<string>(GAMES[0]);
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editGame, setEditGame] = useState<string>(GAMES[0]);
  const [editDescription, setEditDescription] = useState('');

  const startEdit = (m: (typeof modpacks)[number]) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditGame(m.game);
    setEditDescription(m.description ?? '');
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    const pack = modpacks.find((m) => m.id === id);
    if (pack && pack.game !== editGame) {
      const members = robots.filter((r) => r.modpackId === id);
      if (
        members.length > 0 &&
        !(await confirmDialog({
          title: 'Change modpack year',
          message: `${members.length} robot(s) in "${pack.name}" are from ${pack.game}. Changing the pack to ${editGame} will detach them, since a robot can only belong to a modpack from its own year.`,
        }))
      ) {
        return;
      }
    }
    try {
      await api.updateModpack(id, {
        name: editName.trim(),
        game: editGame,
        description: editDescription.trim(),
      });
      if (pack && pack.game !== editGame) {
        const members = robots.filter((r) => r.modpackId === id);
        await Promise.all(members.map((r) => api.setRobotModpack(r.id, null)));
      }
      setEditingId(null);
    } catch (err) {
      void alertDialog((err as Error).message, 'Could not update modpack');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.addModpack({
        name: name.trim(),
        game,
        description: description.trim(),
        private: isPrivate
      });
      setName('');
      setDescription('');
      setIsPrivate(false);
    } catch (err) {
      void alertDialog((err as Error).message, 'Could not add modpack');
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
          <Select value={game} options={GAMES.map((g) => ({ value: g, label: g }))} onChange={setGame} />
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button
            type="button"
            className={`toggle-btn ${isPrivate ? 'on' : ''}`}
            onClick={() => setIsPrivate(!isPrivate)}
          >
            {isPrivate ? '🔒 Private' : '🌐 Public'}
          </button>
          <button className="btn primary" type="submit">
            Add modpack
          </button>
        </form>
      )}
      {modpacks.length === 0 && <div className="empty">No modpacks yet.</div>}
      <div className="pack-list">
        {modpacks.map((m) => {
          const members = robots.filter((r) => r.modpackId === m.id);
          if (canEdit && editingId === m.id) {
            return (
              <div key={m.id} className="pack-row">
                <form
                  className="add-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveEdit(m.id);
                  }}
                >
                  <input
                    placeholder="Pack name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                  <Select value={editGame} options={GAMES.map((g) => ({ value: g, label: g }))} onChange={setEditGame} />
                  <input
                    placeholder="Description (optional)"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <button className="btn primary" type="submit">
                    Save
                  </button>
                  <button className="btn subtle" type="button" onClick={cancelEdit}>
                    Cancel
                  </button>
                </form>
              </div>
            );
          }
          return (
            <div key={m.id} className="pack-row">
              <div className="pack-main">
                <span className="pack-name">{m.name}</span>
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
                  <button type="button" className="btn subtle" onClick={() => startEdit(m)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${m.private ? 'on' : ''}`}
                    onClick={() => api.setModpackPrivacy(m.id, !m.private)}
                  >
                    {m.private ? '🔒 Private' : '🌐 Public'}
                  </button>
                  <button
                    className="btn danger subtle"
                    onClick={async () => {
                      if (
                        await confirmDialog({
                          title: 'Delete modpack',
                          message: `Delete modpack "${m.name}"? Robots inside it are kept but detached.`,
                        })
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
