import { FormEvent, useState } from 'react';
import { fetchTeamName } from '../lib/tba';
import { STEPS } from '../steps';
import { useStore } from '../store/StoreContext';
import { GAMES, MODTYPE_META, ModType, StepProgress } from '../types';
import { useDialog } from './Dialog';
import { Select } from './Select';

const GAME_OPTIONS = GAMES.map((g) => ({ value: g, label: g }));

const MODTYPE_OPTIONS = [
  { value: '', label: 'Mod type: —' },
  ...(Object.keys(MODTYPE_META) as Exclude<ModType, ''>[]).map((m) => ({
    value: m,
    label: MODTYPE_META[m].label,
    className: MODTYPE_META[m].className,
  })),
];

export function RobotForm({ onAdded }: { onAdded?: (id: string) => void }) {
  const { api, modpacks, canEdit } = useStore();
  const { alertDialog } = useDialog();
  const [team, setTeam] = useState('');
  const [teamName, setTeamName] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [game, setGame] = useState<string>(GAMES[0]);
  const [modpackId, setModpackId] = useState('');
  const [modType, setModType] = useState<ModType>('');
  const [markComplete, setMarkComplete] = useState(false);
  const [busy, setBusy] = useState(false);

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

  // Picking a modpack implies the robot is for that pack's game/year.
  // The game dropdown follows automatically but stays manually overridable.
  const syncGameToPack = (packId: string) => {
    const pack = modpacks.find((m) => m.id === packId);
    if (!pack?.game) return;
    const match = GAMES.find(
      (g) => g === pack.game || g.toLowerCase().includes(pack.game.toLowerCase())
    );
    if (match) setGame(match);
  };

  // A robot can only belong to a modpack from its own year, so switching the
  // game clears an incompatible pack selection.
  const changeGame = (g: string) => {
    setGame(g);
    const pack = modpacks.find((m) => m.id === modpackId);
    if (pack && pack.game !== g) setModpackId('');
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
      setGame(newPackGame);
      setNewPackName('');
      setShowNewModpack(false);
    } catch (err) {
      void alertDialog((err as Error).message, 'Something went wrong');
    } finally {
      setCreatingPack(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!team.trim()) return;
    setBusy(true);
    try {
      // "Mark as complete" pre-checks every sub-step (for robots finished
      // before they were tracked) and files the robot as released.
      const progress: Record<string, StepProgress> = {};
      if (markComplete) {
        for (const step of STEPS) {
          progress[step.id] = {
            subs: Object.fromEntries(step.subs.map((s) => [s.id, true])),
            note: '',
          };
        }
      }

      const id = await api.addRobot({
        name: teamName ?? `Team ${team.trim()}`,
        team: team.trim(),
        teamName: teamName ?? undefined,
        game,
        status: markComplete ? 'released' : 'planned',
        modType,
        modpackId: modpackId || null,
        repoId: null,
        private: false,
        notes: '',
        progress
      });
      setTeam('');
      setTeamName(null);
      setModType('');
      setMarkComplete(false);
      onAdded?.(id);
    } catch (err) {
      void alertDialog((err as Error).message, 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const modpackOptions = [
    { value: '', label: 'No modpack' },
    ...modpacks.filter((m) => m.game === game).map((m) => ({ value: m.id, label: m.name })),
  ];

  return (
    <form className="add-form" onSubmit={submit}>
      {/* Team number + TBA name preview */}
      <div className="form-field-group">
        <input
          className="team-input"
          placeholder="Team # (e.g. 9496 or 9496b)"
          value={team}
          onChange={(e) => { setTeam(e.target.value); setTeamName(null); }}
          onBlur={(e) => lookupTeam(e.target.value)}
          required
        />
        {fetching && <span className="muted small">Looking up…</span>}
        {!fetching && teamName && <span className="team-name-tag">✓ {teamName}</span>}
        {!fetching && !teamName && team.trim() && (
          <span className="muted small">Team not found</span>
        )}
      </div>

      {/* Game */}
      <Select className="game-select" value={game} options={GAME_OPTIONS} onChange={changeGame} />

      {/* Modpack + create new */}
      <div className="modpack-group">
        <Select
          value={modpackId}
          options={modpackOptions}
          onChange={(v) => { setModpackId(v); syncGameToPack(v); }}
        />
        <button
          type="button"
          className="btn subtle"
          style={{ fontSize: 12, whiteSpace: 'nowrap' }}
          onClick={() => {
            if (!showNewModpack) setNewPackGame(game);
            setShowNewModpack(!showNewModpack);
          }}
        >
          + New
        </button>
      </div>

      {/* Mod type + completed toggle */}
      <Select value={modType} options={MODTYPE_OPTIONS} onChange={(v) => setModType(v as ModType)} />
      <button
        type="button"
        className={`toggle-btn ${markComplete ? 'on' : ''}`}
        title="Adds the robot with every step already checked (status: Released)"
        onClick={() => setMarkComplete(!markComplete)}
      >
        {markComplete ? '✓ Already complete' : 'Mark as complete'}
      </button>

      {/* Inline new-modpack mini-form */}
      {showNewModpack && (
        <div className="inline-modpack-form">
          <input
            placeholder="Pack name"
            value={newPackName}
            onChange={(e) => setNewPackName(e.target.value)}
            style={{ minWidth: 140 }}
          />
          <Select value={newPackGame} options={GAME_OPTIONS} onChange={setNewPackGame} />
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
    </form>
  );
}
