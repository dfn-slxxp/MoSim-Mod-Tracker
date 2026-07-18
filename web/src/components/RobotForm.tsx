import { FormEvent, useState } from 'react';
import { fetchTeamName, getTbaKey, setTbaKey } from '../lib/tba';
import { useStore } from '../store/StoreContext';
import { GAMES } from '../types';

export function RobotForm({ onAdded }: { onAdded?: (id: string) => void }) {
  const { api, modpacks, canEdit } = useStore();
  const [team, setTeam] = useState('');
  const [teamName, setTeamName] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [game, setGame] = useState<string>(GAMES[0]);
  const [modpackId, setModpackId] = useState('');
  const [busy, setBusy] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState(getTbaKey());

  // Inline new modpack
  const [showNewModpack, setShowNewModpack] = useState(false);
  const [newPackName, setNewPackName] = useState('');
  const [newPackGame, setNewPackGame] = useState<string>(GAMES[0]);
  const [creatingPack, setCreatingPack] = useState(false);

  if (!canEdit) return null;

  const lookupTeam = async (num: string) => {
    const trimmed = num.trim();
    if (!trimmed) { setTeamName(null); return; }
    setFetching(true);
    const name = await fetchTeamName(trimmed);
    setTeamName(name);
    setFetching(false);
  };

  const createModpack = async () => {
    if (!newPackName.trim()) return;
    setCreatingPack(true);
    try {
      const id = await api.addModpack({
        name: newPackName.trim(),
        game: newPackGame,
        description: '',
        private: false,
      });
      setModpackId(id);
      setNewPackName('');
      setShowNewModpack(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCreatingPack(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!team.trim()) return;
    setBusy(true);
    try {
      const id = await api.addRobot({
        name: teamName ?? `Team ${team.trim()}`,
        team: team.trim(),
        teamName: teamName ?? undefined,
        game,
        status: 'planned',
        modType: '',
        modpackId: modpackId || null,
        repoId: null,
        private: false,
        notes: '',
        progress: {}
      });
      setTeam('');
      setTeamName(null);
      onAdded?.(id);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const hasTbaKey = !!getTbaKey();

  return (
    <form className="add-form" onSubmit={submit}>
      {/* Team number + TBA name preview */}
      <div className="form-field-group">
        <input
          className="team-input"
          placeholder="Team # (e.g. 9496)"
          value={team}
          onChange={(e) => { setTeam(e.target.value); setTeamName(null); }}
          onBlur={(e) => lookupTeam(e.target.value)}
          required
        />
        {fetching && <span className="muted" style={{ fontSize: 12 }}>Looking up…</span>}
        {!fetching && teamName && <span className="team-name-tag">✓ {teamName}</span>}
        {!fetching && !teamName && team.trim() && hasTbaKey && (
          <span className="muted" style={{ fontSize: 12 }}>Team not found</span>
        )}
      </div>

      {/* Game dropdown */}
      <select className="game-select" value={game} onChange={(e) => setGame(e.target.value)}>
        {GAMES.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>

      {/* Modpack dropdown + create new */}
      <div className="modpack-group">
        <select value={modpackId} onChange={(e) => setModpackId(e.target.value)}>
          <option value="">No modpack</option>
          {modpacks.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn subtle"
          style={{ fontSize: 12, whiteSpace: 'nowrap' }}
          onClick={() => setShowNewModpack(!showNewModpack)}
        >
          + New
        </button>
      </div>

      {/* Inline new-modpack mini-form */}
      {showNewModpack && (
        <div className="inline-modpack-form">
          <input
            placeholder="Pack name"
            value={newPackName}
            onChange={(e) => setNewPackName(e.target.value)}
            style={{ minWidth: 140 }}
          />
          <select value={newPackGame} onChange={(e) => setNewPackGame(e.target.value)}>
            {GAMES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button
            type="button"
            className="btn primary"
            disabled={creatingPack || !newPackName.trim()}
            onClick={createModpack}
          >
            {creatingPack ? 'Creating…' : 'Create'}
          </button>
          <button
            type="button"
            className="btn subtle"
            onClick={() => { setShowNewModpack(false); setNewPackName(''); }}
          >
            Cancel
          </button>
        </div>
      )}

      <button className="btn primary" disabled={busy} type="submit">
        Add robot
      </button>

      {/* TBA key config */}
      {!hasTbaKey && !showKeyInput && (
        <button
          type="button"
          className="btn subtle"
          style={{ fontSize: 12 }}
          onClick={() => setShowKeyInput(true)}
        >
          Set TBA API key →
        </button>
      )}
      {hasTbaKey && (
        <span className="team-name-tag" style={{ cursor: 'pointer' }} onClick={() => setShowKeyInput(!showKeyInput)}>
          TBA ✓
        </span>
      )}
      {showKeyInput && (
        <div className="tba-key-row">
          <input
            placeholder="TBA read API key"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <button
            type="button"
            className="btn"
            onClick={() => { setTbaKey(keyDraft); setShowKeyInput(false); }}
          >
            Save
          </button>
          <a
            href="https://www.thebluealliance.com/account"
            target="_blank"
            rel="noreferrer"
            className="muted"
            style={{ fontSize: 12 }}
          >
            Get key ↗
          </a>
        </div>
      )}
    </form>
  );
}
