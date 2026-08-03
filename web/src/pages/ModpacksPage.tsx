import { ChangeEvent, FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDialog } from '../components/Dialog';
import { Select } from '../components/Select';
import { useStore } from '../store/StoreContext';
import { GAMES, Modpack } from '../types';

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

  const [pageOpenId, setPageOpenId] = useState<string | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorError, setAuthorError] = useState<string | null>(null);
  const [savingAuthor, setSavingAuthor] = useState(false);
  const [externalTeam, setExternalTeam] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalError, setExternalError] = useState<string | null>(null);
  const [savingExternal, setSavingExternal] = useState(false);

  const togglePagePanel = (m: Modpack) => {
    if (pageOpenId === m.id) {
      setPageOpenId(null);
      return;
    }
    setPageOpenId(m.id);
    setSlugInput(m.slug ?? '');
    setSlugError(null);
    setAuthorEmail('');
    setAuthorError(null);
    setExternalTeam('');
    setExternalName('');
    setExternalError(null);
  };

  const publishPage = async (m: Modpack) => {
    setSavingSlug(true);
    setSlugError(null);
    try {
      await api.updateModpack(m.id, { slug: slugInput.trim().toLowerCase(), hasPage: true });
    } catch (err) {
      setSlugError((err as Error).message);
    } finally {
      setSavingSlug(false);
    }
  };

  const unpublishPage = async (m: Modpack) => {
    try {
      await api.updateModpack(m.id, { hasPage: false });
    } catch (err) {
      void alertDialog((err as Error).message, 'Could not unpublish page');
    }
  };

  const addAuthor = async (m: Modpack) => {
    if (!authorEmail.trim()) return;
    setSavingAuthor(true);
    setAuthorError(null);
    try {
      await api.addModpackAuthor(m.id, authorEmail.trim());
      setAuthorEmail('');
    } catch (err) {
      setAuthorError((err as Error).message);
    } finally {
      setSavingAuthor(false);
    }
  };

  const removeAuthor = async (m: Modpack, uid: string) => {
    try {
      await api.removeModpackAuthor(m.id, uid);
    } catch (err) {
      void alertDialog((err as Error).message, 'Could not remove author');
    }
  };

  const addExternalRobot = async (m: Modpack) => {
    if (!externalTeam.trim()) return;
    setSavingExternal(true);
    setExternalError(null);
    try {
      await api.addExternalRobot(m.id, externalTeam.trim(), externalName.trim() || undefined);
      setExternalTeam('');
      setExternalName('');
    } catch (err) {
      setExternalError((err as Error).message);
    } finally {
      setSavingExternal(false);
    }
  };

  const removeExternalRobot = async (m: Modpack, erId: string) => {
    try {
      await api.removeExternalRobot(m.id, erId);
    } catch (err) {
      void alertDialog((err as Error).message, 'Could not remove robot');
    }
  };

  const handleUpload = async (m: Modpack, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingId(m.id);
    try {
      await api.uploadModpackMedia(m.id, file);
    } catch (err) {
      void alertDialog((err as Error).message, 'Could not upload media');
    } finally {
      setUploadingId(null);
    }
  };

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
          <textarea
            placeholder="Description (optional)"
            rows={2}
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
                  <textarea
                    placeholder="Description (optional)"
                    rows={2}
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
                    type="button"
                    className={`toggle-btn ${m.hasPage ? 'on' : ''}`}
                    onClick={() => togglePagePanel(m)}
                  >
                    {m.hasPage ? '🖼️ Page live' : '🖼️ Add page'}
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
              {canEdit && pageOpenId === m.id && (
                <div className="pack-page-panel">
                  <div className="pack-page-row">
                    <span className="pack-page-prefix">/packs/</span>
                    <input
                      className="pack-page-slug"
                      placeholder="my-modpack"
                      value={slugInput}
                      onChange={(e) => {
                        setSlugInput(e.target.value);
                        setSlugError(null);
                      }}
                      aria-label="Public page URL"
                    />
                    <button
                      type="button"
                      className="btn primary"
                      disabled={savingSlug || !slugInput.trim()}
                      onClick={() => publishPage(m)}
                    >
                      {m.hasPage ? 'Update' : 'Publish'}
                    </button>
                    {m.hasPage && (
                      <button type="button" className="btn subtle" onClick={() => unpublishPage(m)}>
                        Unpublish
                      </button>
                    )}
                  </div>
                  {slugError && <p className="field-error">{slugError}</p>}
                  {m.hasPage && m.slug && (
                    <Link to={`/packs/${m.slug}`} className="pack-page-view link" target="_blank" rel="noreferrer">
                      View live page →
                    </Link>
                  )}

                  <div className="pack-media-list">
                    {(m.media ?? []).map((item) => (
                      <div key={item.id} className="pack-media-thumb">
                        {item.type === 'video' ? (
                          <video src={item.url} muted />
                        ) : (
                          <img src={item.url} alt="" />
                        )}
                        <button
                          type="button"
                          className="pack-media-remove"
                          aria-label="Remove media"
                          onClick={() => api.deleteModpackMedia(m.id, item.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="pack-media-add">
                      {uploadingId === m.id ? 'Uploading…' : '+ Add media'}
                      <input
                        type="file"
                        accept="image/*,video/*"
                        hidden
                        disabled={uploadingId === m.id}
                        onChange={(e) => handleUpload(m, e)}
                      />
                    </label>
                  </div>

                  <div className="pack-authors">
                    <span className="muted small">Co-authors</span>
                    <div className="pack-authors-list">
                      {(m.coAuthors ?? []).length === 0 && <span className="muted small">None yet</span>}
                      {(m.coAuthors ?? []).map((a) => (
                        <span key={a.uid} className="pack-chip">
                          {a.displayName}
                          <button
                            type="button"
                            className="pack-author-remove"
                            aria-label={`Remove ${a.displayName} as author`}
                            onClick={() => removeAuthor(m, a.uid)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="pack-page-row">
                      <input
                        placeholder="Add author by email"
                        value={authorEmail}
                        onChange={(e) => {
                          setAuthorEmail(e.target.value);
                          setAuthorError(null);
                        }}
                        aria-label="Co-author email"
                      />
                      <button
                        type="button"
                        className="btn subtle"
                        disabled={savingAuthor || !authorEmail.trim()}
                        onClick={() => addAuthor(m)}
                      >
                        Add
                      </button>
                    </div>
                    {authorError && <p className="field-error">{authorError}</p>}
                  </div>

                  <div className="pack-authors">
                    <span className="muted small">Other people's robots (not tracked by the site)</span>
                    <div className="pack-authors-list">
                      {(m.externalRobots ?? []).length === 0 && <span className="muted small">None yet</span>}
                      {(m.externalRobots ?? []).map((e) => (
                        <span key={e.id} className="pack-chip">
                          {e.team}
                          {e.name ? ` — ${e.name}` : ''}
                          <button
                            type="button"
                            className="pack-author-remove"
                            aria-label={`Remove team ${e.team}`}
                            onClick={() => removeExternalRobot(m, e.id)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="pack-page-row">
                      <input
                        placeholder="Team #"
                        value={externalTeam}
                        onChange={(e) => {
                          setExternalTeam(e.target.value);
                          setExternalError(null);
                        }}
                        aria-label="Team number"
                      />
                      <input
                        placeholder="Robot name (optional)"
                        value={externalName}
                        onChange={(e) => setExternalName(e.target.value)}
                        aria-label="Robot name"
                      />
                      <button
                        type="button"
                        className="btn subtle"
                        disabled={savingExternal || !externalTeam.trim()}
                        onClick={() => addExternalRobot(m)}
                      >
                        Add
                      </button>
                    </div>
                    {externalError && <p className="field-error">{externalError}</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
