// ---------------------------------------------------------------------------
// LocalBackend — stores everything as one JSON blob in localStorage (a small
// per-site key/value store the browser persists on disk). No accounts, no
// network. Used until a Firebase config is provided.
//
// JS notes: `async` methods return a Promise (like Task<T> in C#) even when
// they finish instantly — that keeps the interface identical to the cloud
// backend. Arrow functions (`=>`) capture `this` automatically, which is why
// the event handler below is written as a class field.
// ---------------------------------------------------------------------------
import type {
  Modpack,
  NewModpack,
  NewRepo,
  NewRobot,
  NewScript,
  Repo,
  RepoScan,
  Robot,
  ScriptDoc
} from '../types';
import { normalizeRobot } from '../types';
import { Backend, StoreState, nextOrder, sortByOrder } from './backend';

const KEY = 'mosim-mod-tracker';

interface LocalData {
  robots: Robot[];
  modpacks: Modpack[];
  repos: Repo[];
  scripts: ScriptDoc[];
}

/** Read + parse the blob, tolerating missing keys and corrupt JSON. */
function load(): LocalData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalData;
      return {
        robots: (parsed.robots ?? []).map(normalizeRobot),
        modpacks: parsed.modpacks ?? [],
        repos: parsed.repos ?? [],
        scripts: parsed.scripts ?? []
      };
    }
  } catch {
    // corrupted data -> start fresh rather than crash the app
  }
  return { robots: [], modpacks: [], repos: [], scripts: [] };
}

export class LocalBackend implements Backend {
  private data: LocalData = load();
  private onChange: ((patch: Partial<StoreState>) => void) | null = null;

  init(onChange: (patch: Partial<StoreState>) => void): void {
    this.onChange = onChange;
    // The 'storage' event fires when ANOTHER tab/window writes localStorage —
    // this is how the compact overlay and a browser tab stay in sync.
    window.addEventListener('storage', this.onStorage);
    this.emit();
    onChange({ mode: 'local', ready: true, user: null, canEdit: true, error: null });
  }

  dispose(): void {
    window.removeEventListener('storage', this.onStorage);
    this.onChange = null;
  }

  private onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      this.data = load();
      this.emit();
    }
  };

  /** Push current lists to the UI. */
  private emit() {
    this.onChange?.({
      robots: sortByOrder(this.data.robots),
      modpacks: sortByOrder(this.data.modpacks),
      repos: sortByOrder(this.data.repos),
      scripts: sortByOrder(this.data.scripts)
    });
  }

  /** Persist + notify. Called after every mutation. */
  private save() {
    localStorage.setItem(KEY, JSON.stringify(this.data));
    this.emit();
  }

  // ---- robots ----

  async addRobot(robot: NewRobot): Promise<string> {
    const id = crypto.randomUUID();
    this.data.robots.push({
      ...robot, // spread = copy all fields from the partial object
      id,
      ownerUid: null,
      modpackPrivate: robot.modpackId
        ? this.data.modpacks.find((m) => m.id === robot.modpackId)?.private ?? false
        : false,
      order: nextOrder(this.data.robots),
      createdAt: Date.now()
    });
    this.save();
    return id;
  }

  async updateRobot(id: string, patch: Partial<Robot>): Promise<void> {
    const r = this.data.robots.find((x) => x.id === id);
    if (r) Object.assign(r, patch); // shallow merge, like a C# object initializer over an existing object
    this.save();
  }

  async deleteRobot(id: string): Promise<void> {
    this.data.robots = this.data.robots.filter((x) => x.id !== id);
    this.save();
  }

  // ---- modpacks ----

  async addModpack(pack: NewModpack): Promise<string> {
    const id = crypto.randomUUID();
    this.data.modpacks.push({
      ...pack,
      id,
      ownerUid: null,
      order: nextOrder(this.data.modpacks),
      createdAt: Date.now()
    });
    this.save();
    return id;
  }

  async updateModpack(id: string, patch: Partial<Modpack>): Promise<void> {
    const m = this.data.modpacks.find((x) => x.id === id);
    if (m) Object.assign(m, patch);
    this.save();
  }

  async setModpackPrivacy(id: string, isPrivate: boolean): Promise<void> {
    const m = this.data.modpacks.find((x) => x.id === id);
    if (!m) return;
    m.private = isPrivate;
    // Keep the copied flag on member robots in sync (see types.ts for why).
    for (const r of this.data.robots) {
      if (r.modpackId === id) r.modpackPrivate = isPrivate;
    }
    this.save();
  }

  async deleteModpack(id: string): Promise<void> {
    this.data.modpacks = this.data.modpacks.filter((x) => x.id !== id);
    for (const r of this.data.robots) {
      if (r.modpackId === id) {
        r.modpackId = null;
        r.modpackPrivate = false;
      }
    }
    this.save();
  }

  async setRobotModpack(robotId: string, modpackId: string | null): Promise<void> {
    const r = this.data.robots.find((x) => x.id === robotId);
    if (!r) return;
    r.modpackId = modpackId;
    r.modpackPrivate = modpackId
      ? this.data.modpacks.find((m) => m.id === modpackId)?.private ?? false
      : false;
    this.save();
  }

  // ---- repos ----

  async addRepo(repo: NewRepo): Promise<string> {
    const id = crypto.randomUUID();
    this.data.repos.push({
      ...repo,
      id,
      ownerUid: null,
      scan: null,
      order: nextOrder(this.data.repos),
      createdAt: Date.now()
    });
    this.save();
    return id;
  }

  async updateRepo(id: string, patch: Partial<Repo>): Promise<void> {
    const r = this.data.repos.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
    this.save();
  }

  async deleteRepo(id: string): Promise<void> {
    this.data.repos = this.data.repos.filter((x) => x.id !== id);
    // Detach robots that pointed at this repo.
    for (const r of this.data.robots) {
      if (r.repoId === id) r.repoId = null;
    }
    this.save();
  }

  async saveRepoScan(id: string, scan: RepoScan): Promise<void> {
    await this.updateRepo(id, { scan });
  }

  // ---- script library ----

  async addScript(script: NewScript): Promise<string> {
    const id = crypto.randomUUID();
    this.data.scripts.push({
      ...script,
      id,
      ownerUid: null,
      order: nextOrder(this.data.scripts),
      createdAt: Date.now()
    });
    this.save();
    return id;
  }

  async updateScript(id: string, patch: Partial<ScriptDoc>): Promise<void> {
    const s = this.data.scripts.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
    this.save();
  }

  async deleteScript(id: string): Promise<void> {
    this.data.scripts = this.data.scripts.filter((x) => x.id !== id);
    this.save();
  }

  // ---- auth (not available in local mode) ----

  async signIn(): Promise<void> {
    throw new Error('Sign-in requires Firebase. See README to set it up.');
  }

  async signOut(): Promise<void> {
    // no-op in local mode
  }
}
