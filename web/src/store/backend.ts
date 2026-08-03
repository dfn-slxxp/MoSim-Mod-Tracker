// ---------------------------------------------------------------------------
// The storage abstraction. The app talks to a `Backend` interface and never
// cares whether data lives in localStorage (LocalBackend) or Firestore
// (CloudBackend) — same idea as coding against an interface in Java/C#.
// Which one is used is decided once in StoreContext.tsx.
// ---------------------------------------------------------------------------
import type {
  AuthProvider,
  AuthProviderAvailability,
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
  ready: boolean; // false until the first Firestore subscription completes
  user: UserInfo | null; // null = not signed in
  robots: Robot[];
  modpacks: Modpack[];
  repos: Repo[];
  /** Script library — only visible to the signed-in owner, never public. */
  scripts: ScriptDoc[];
  /** True when signed in (required to create or edit anything). */
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

  /** Save the signed-in user's public profile (display name + handles + photo). */
  updateProfile(patch: {
    displayName: string;
    instagram: string;
    discord: string;
    /** Omit to leave unchanged, null to reset to the sign-in provider's photo, or a data: URI to set a custom one. */
    photo?: string | null;
  }): Promise<void>;
  /** Re-fetch the current user (name, profile, linked accounts). */
  refreshUser(): Promise<void>;
  /** Begin linking another account (any provider) to this one. */
  startLinkAccount(provider?: AuthProvider): Promise<void>;
  /** Remove a linked secondary account by its stored subject. */
  unlinkAccount(sub: string): Promise<void>;
  /** Which sign-in providers the server has configured. */
  authProviders(): Promise<AuthProviderAvailability>;

  signIn(provider?: AuthProvider): Promise<void>;
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
