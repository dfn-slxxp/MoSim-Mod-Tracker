// ---------------------------------------------------------------------------
// The storage abstraction. The app talks to a `Backend` interface and never
// cares whether data lives in localStorage (LocalBackend) or Firestore
// (CloudBackend) — same idea as coding against an interface in Java/C#.
// Which one is used is decided once in StoreContext.tsx.
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

/** Everything the UI needs to render, kept in one state object. */
export interface StoreState {
  mode: 'local' | 'cloud';
  ready: boolean; // false until the first load/subscription completes
  user: UserInfo | null; // null = not signed in (or local mode)
  robots: Robot[];
  modpacks: Modpack[];
  repos: Repo[];
  /** Your script library. Cloud mode: only visible to the signed-in owner. */
  scripts: ScriptDoc[];
  /** True when the current session is allowed to edit (local mode, or signed in). */
  canEdit: boolean;
  error: string | null;
}

export interface Backend {
  /**
   * Start loading/subscribing. `onChange` is called with partial state updates
   * whenever anything changes (think: an event the UI subscribes to).
   */
  init(onChange: (patch: Partial<StoreState>) => void): void;
  dispose(): void;

  addRobot(robot: NewRobot): Promise<string>; // resolves to the new id
  updateRobot(id: string, patch: Partial<Robot>): Promise<void>;
  deleteRobot(id: string): Promise<void>;

  addModpack(pack: NewModpack): Promise<string>;
  updateModpack(id: string, patch: Partial<Modpack>): Promise<void>;
  /** Toggle modpack privacy and sync the denormalized flag onto member robots. */
  setModpackPrivacy(id: string, isPrivate: boolean): Promise<void>;
  /** Delete a modpack and detach its robots (robots are kept). */
  deleteModpack(id: string): Promise<void>;
  /** Move a robot into a modpack (or null), keeping modpackPrivate in sync. */
  setRobotModpack(robotId: string, modpackId: string | null): Promise<void>;

  addRepo(repo: NewRepo): Promise<string>;
  updateRepo(id: string, patch: Partial<Repo>): Promise<void>;
  deleteRepo(id: string): Promise<void>;
  /** Store the result of a desktop-side folder scan on the repo record. */
  saveRepoScan(id: string, scan: RepoScan): Promise<void>;

  addScript(script: NewScript): Promise<string>;
  updateScript(id: string, patch: Partial<ScriptDoc>): Promise<void>;
  deleteScript(id: string): Promise<void>;

  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

/** Stable sort: manual order first, creation time as tiebreaker. */
export function sortByOrder<T extends { order: number; createdAt: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
}

/** Next `order` value so new items land at the bottom of the list. */
export function nextOrder(items: { order: number }[]): number {
  return items.reduce((m, i) => Math.max(m, i.order), 0) + 1;
}
