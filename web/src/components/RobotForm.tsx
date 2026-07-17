// ---------------------------------------------------------------------------
// "Add robot" form, shared by the Robots page (status starts at Claimed) and
// the Planned page (status starts at Planned).
// React form pattern: each input's value lives in state ("controlled input"),
// onChange keeps it in sync, submit handler calls the store API.
// ---------------------------------------------------------------------------
import { FormEvent, useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { RobotStatus } from '../types';

export function RobotForm({ status, onAdded }: { status: RobotStatus; onAdded?: (id: string) => void }) {
  const { api, modpacks, repos, canEdit } = useStore();
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [game, setGame] = useState('Reefscape');
  const [modpackId, setModpackId] = useState('');
  const [repoId, setRepoId] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!canEdit) return null; // read-only visitors don't get the form

  const submit = async (e: FormEvent) => {
    e.preventDefault(); // stop the browser's default full-page form submit
    if (!name.trim()) return;
    setBusy(true);
    try {
      const id = await api.addRobot({
        name: name.trim(),
        team: team.trim(),
        game: game.trim() || 'Reefscape',
        status,
        modType: '',
        modpackId: modpackId || null,
        repoId: repoId || null,
        private: isPrivate,
        notes: '',
        progress: {}
      });
      setName('');
      setTeam('');
      onAdded?.(id);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="add-form" onSubmit={submit}>
      <input
        placeholder="Robot name (e.g. Lynk)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input placeholder="Team # (e.g. 9496)" value={team} onChange={(e) => setTeam(e.target.value)} />
      <input placeholder="Game" value={game} onChange={(e) => setGame(e.target.value)} />
      <select value={modpackId} onChange={(e) => setModpackId(e.target.value)}>
        <option value="">No modpack</option>
        {modpacks.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <select value={repoId} onChange={(e) => setRepoId(e.target.value)}>
        <option value="">No repo</option>
        {repos.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <label className="inline-check">
        <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
        Private
      </label>
      <button className="btn primary" disabled={busy} type="submit">
        {status === 'planned' ? 'Add plan' : 'Add robot'}
      </button>
    </form>
  );
}
