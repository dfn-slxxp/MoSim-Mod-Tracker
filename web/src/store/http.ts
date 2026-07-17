// ---------------------------------------------------------------------------
// HTTPBackend — talks to the Express REST API on the server.
// Replaces CloudBackend (Firebase). Auth is a server-side OAuth2 redirect
// flow; data lives in SQLite on the droplet.
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
  ScriptDoc,
  UserInfo
} from '../types';
import { normalizeRobot } from '../types';
import type { Backend, StoreState } from './backend';
import { sortByOrder } from './backend';

export class HTTPBackend implements Backend {
  private _onChange: ((patch: Partial<StoreState>) => void) | null = null;

  // ── Low-level fetch helpers ───────────────────────────────────────────────

  private async _req(method: string, url: string, body?: unknown): Promise<unknown> {
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    if (res.status === 401) return null; // session missing / expired
    if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
    return res.json();
  }

  private _get(url: string) { return this._req('GET', url); }
  private _post(url: string, body?: unknown) { return this._req('POST', url, body); }
  private _put(url: string, body: unknown) { return this._req('PUT', url, body); }
  private _del(url: string) { return this._req('DELETE', url); }

  // Re-fetch all collections and push the update to the UI.
  private async _refetch(): Promise<void> {
    const data = await this._get('/api/data') as DataPayload | null;
    if (!data) {
      // Session expired mid-session
      this._onChange?.({ user: null, canEdit: false, robots: [], modpacks: [], repos: [], scripts: [] });
      return;
    }
    this._onChange?.({
      robots:   sortByOrder(data.robots.map(normalizeRobot)),
      modpacks: sortByOrder(data.modpacks),
      repos:    sortByOrder(data.repos),
      scripts:  sortByOrder(data.scripts)
    });
  }

  // ── Backend interface ─────────────────────────────────────────────────────

  init(onChange: (patch: Partial<StoreState>) => void): void {
    this._onChange = onChange;
    onChange({ ready: false, error: null });
    void this._load();
  }

  dispose(): void {
    this._onChange = null;
  }

  private async _load(): Promise<void> {
    try {
      const me = await this._get('/api/me') as UserInfo | null;
      if (me) {
        const data = await this._get('/api/data') as DataPayload;
        this._onChange?.({
          ready: true,
          user: me,
          canEdit: true,
          robots:   sortByOrder(data.robots.map(normalizeRobot)),
          modpacks: sortByOrder(data.modpacks),
          repos:    sortByOrder(data.repos),
          scripts:  sortByOrder(data.scripts),
          error: null
        });
      } else {
        this._onChange?.({
          ready: true, user: null, canEdit: false,
          robots: [], modpacks: [], repos: [], scripts: [], error: null
        });
      }
    } catch (e) {
      this._onChange?.({ ready: true, error: (e as Error).message });
    }
  }

  // ── Robots ────────────────────────────────────────────────────────────────

  async addRobot(robot: NewRobot): Promise<string> {
    const r = await this._post('/api/robots', robot) as { id: string };
    await this._refetch();
    return r.id;
  }

  async updateRobot(id: string, patch: Partial<Robot>): Promise<void> {
    await this._put(`/api/robots/${id}`, patch);
    await this._refetch();
  }

  async deleteRobot(id: string): Promise<void> {
    await this._del(`/api/robots/${id}`);
    await this._refetch();
  }

  // ── Modpacks ──────────────────────────────────────────────────────────────

  async addModpack(pack: NewModpack): Promise<string> {
    const r = await this._post('/api/modpacks', pack) as { id: string };
    await this._refetch();
    return r.id;
  }

  async updateModpack(id: string, patch: Partial<Modpack>): Promise<void> {
    await this._put(`/api/modpacks/${id}`, patch);
    await this._refetch();
  }

  async setModpackPrivacy(id: string, isPrivate: boolean): Promise<void> {
    await this._post(`/api/modpacks/${id}/privacy`, { isPrivate });
    await this._refetch();
  }

  async deleteModpack(id: string): Promise<void> {
    await this._del(`/api/modpacks/${id}`);
    await this._refetch();
  }

  async setRobotModpack(robotId: string, modpackId: string | null): Promise<void> {
    await this._post(`/api/robots/${robotId}/modpack`, { modpackId });
    await this._refetch();
  }

  // ── Repos ─────────────────────────────────────────────────────────────────

  async addRepo(repo: NewRepo): Promise<string> {
    const r = await this._post('/api/repos', { ...repo, scan: null }) as { id: string };
    await this._refetch();
    return r.id;
  }

  async updateRepo(id: string, patch: Partial<Repo>): Promise<void> {
    await this._put(`/api/repos/${id}`, patch);
    await this._refetch();
  }

  async deleteRepo(id: string): Promise<void> {
    await this._del(`/api/repos/${id}`);
    await this._refetch();
  }

  async saveRepoScan(id: string, scan: RepoScan): Promise<void> {
    await this._put(`/api/repos/${id}`, { scan });
    await this._refetch();
  }

  // ── Scripts ───────────────────────────────────────────────────────────────

  async addScript(script: NewScript): Promise<string> {
    const r = await this._post('/api/scripts', script) as { id: string };
    await this._refetch();
    return r.id;
  }

  async updateScript(id: string, patch: Partial<ScriptDoc>): Promise<void> {
    await this._put(`/api/scripts/${id}`, patch);
    await this._refetch();
  }

  async deleteScript(id: string): Promise<void> {
    await this._del(`/api/scripts/${id}`);
    await this._refetch();
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async signIn(): Promise<void> {
    // Server-side OAuth redirect — navigates away; no return value needed.
    window.location.href = '/api/auth/login';
  }

  async signOut(): Promise<void> {
    await this._post('/api/auth/logout');
    // Clear local state immediately (no reload needed)
    this._onChange?.({
      user: null, canEdit: false,
      robots: [], modpacks: [], repos: [], scripts: []
    });
  }
}

interface DataPayload {
  robots: Robot[];
  modpacks: Modpack[];
  repos: Repo[];
  scripts: ScriptDoc[];
}
