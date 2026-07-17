// ---------------------------------------------------------------------------
// CloudBackend — Firebase Auth (Google sign-in) + Firestore (the database).
//
// Firestore in 60 seconds (for the SQL/ORM-minded):
//   - Data lives in named "collections" of "documents" (JSON-ish objects).
//   - There are no joins. Queries are simple filters (`where(...)`).
//   - `onSnapshot(query, cb)` is the killer feature: cb fires immediately with
//     current results AND again every time matching data changes on the
//     server. That's what makes edits sync live between devices.
//   - Security is enforced server-side by rules (see firestore.rules), not by
//     this client code — the client just avoids asking for what it can't get.
//
// Because anonymous visitors may only read public docs, we can't run one
// "give me everything" query. Instead we run a PUBLIC query (private == false)
// and, when signed in, a MINE query (ownerUid == me), then merge the results
// by document id.
// ---------------------------------------------------------------------------
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut
} from 'firebase/auth';
import {
  Firestore,
  Query,
  Unsubscribe,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import type { FirebaseOptions } from 'firebase/app';
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
import { Backend, StoreState, nextOrder, sortByOrder } from './backend';

type DocMap<T> = Map<string, T>;

export class CloudBackend implements Backend {
  private app: FirebaseApp;
  private auth: Auth;
  private db: Firestore;
  private onChange: ((patch: Partial<StoreState>) => void) | null = null;
  private unsubs: Unsubscribe[] = []; // active onSnapshot listeners (to detach later)
  private authUnsub: Unsubscribe | null = null;

  // One Map per running query; emit() merges them (id -> doc, later wins).
  private robotSources: DocMap<Robot>[] = [];
  private packSources: DocMap<Modpack>[] = [];
  private repoSources: DocMap<Repo>[] = [];
  private scriptSources: DocMap<ScriptDoc>[] = [];
  private robots: Robot[] = [];
  private modpacks: Modpack[] = [];
  private repos: Repo[] = [];
  private scripts: ScriptDoc[] = [];

  constructor(config: FirebaseOptions) {
    this.app = initializeApp(config);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
  }

  init(onChange: (patch: Partial<StoreState>) => void): void {
    this.onChange = onChange;
    onChange({ ready: false, error: null });

    // Fires on page load with the remembered session, and on sign-in/out.
    this.authUnsub = onAuthStateChanged(this.auth, (user) => {
      const info: UserInfo | null = user
        ? {
            uid: user.uid,
            name: user.displayName ?? user.email ?? 'Signed in',
            email: user.email ?? '',
            photo: user.photoURL
          }
        : null;
      onChange({ user: info, canEdit: !!info });
      this.resubscribe(user?.uid ?? null); // different queries when signed in
    });
  }

  dispose(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.authUnsub?.();
    this.onChange = null;
  }

  /** Tear down old listeners and start the right set for the current user. */
  private resubscribe(uid: string | null) {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.robotSources = [];
    this.packSources = [];
    this.repoSources = [];
    this.scriptSources = [];

    const robotsCol = collection(this.db, 'robots');
    const packsCol = collection(this.db, 'modpacks');
    const reposCol = collection(this.db, 'repos');
    const scriptsCol = collection(this.db, 'scripts');

    const robotQueries: Query[] = [
      // Public robots: both privacy flags must be false (rules enforce this too).
      query(robotsCol, where('private', '==', false), where('modpackPrivate', '==', false))
    ];
    const packQueries: Query[] = [query(packsCol, where('private', '==', false))];
    const repoQueries: Query[] = [query(reposCol, where('private', '==', false))];

    // Scripts are never public — only queried for the signed-in owner.
    const scriptQueries: Query[] = [];

    if (uid) {
      // Plus everything the signed-in user owns (includes their private docs).
      robotQueries.push(query(robotsCol, where('ownerUid', '==', uid)));
      packQueries.push(query(packsCol, where('ownerUid', '==', uid)));
      repoQueries.push(query(reposCol, where('ownerUid', '==', uid)));
      scriptQueries.push(query(scriptsCol, where('ownerUid', '==', uid)));
    } else {
      this.scripts = [];
      this.onChange?.({ scripts: [] });
    }

    // Flip `ready` only after every query has answered at least once.
    let pending =
      robotQueries.length + packQueries.length + repoQueries.length + scriptQueries.length;
    const markReady = () => {
      pending--;
      if (pending <= 0) this.onChange?.({ ready: true });
    };

    // Generic wiring for one query -> one source map.
    const listen = <T extends { id: string }>(
      q: Query,
      sources: DocMap<T>[],
      transform: (raw: Record<string, unknown>, id: string) => T
    ) => {
      const idx = sources.push(new Map()) - 1;
      let first = true;
      this.unsubs.push(
        onSnapshot(
          q,
          (snap) => {
            const map: DocMap<T> = new Map();
            snap.forEach((d) => map.set(d.id, transform(d.data(), d.id)));
            sources[idx] = map;
            this.emit();
            if (first) {
              first = false;
              markReady();
            }
          },
          (err) => this.onChange?.({ error: err.message, ready: true })
        )
      );
    };

    robotQueries.forEach((q) =>
      listen(q, this.robotSources, (raw, id) => normalizeRobot({ ...(raw as Omit<Robot, 'id'>), id } as Robot))
    );
    packQueries.forEach((q) =>
      listen(q, this.packSources, (raw, id) => ({ ...(raw as Omit<Modpack, 'id'>), id }) as Modpack)
    );
    repoQueries.forEach((q) =>
      listen(q, this.repoSources, (raw, id) => ({ ...(raw as Omit<Repo, 'id'>), id }) as Repo)
    );
    scriptQueries.forEach((q) =>
      listen(q, this.scriptSources, (raw, id) => ({ ...(raw as Omit<ScriptDoc, 'id'>), id }) as ScriptDoc)
    );
  }

  /** Merge all source maps and hand sorted arrays to the UI. */
  private emit() {
    const merge = <T>(sources: DocMap<T>[]): T[] => {
      const map: DocMap<T> = new Map();
      for (const src of sources) for (const [id, v] of src) map.set(id, v);
      return [...map.values()];
    };
    this.robots = sortByOrder(merge(this.robotSources));
    this.modpacks = sortByOrder(merge(this.packSources));
    this.repos = sortByOrder(merge(this.repoSources));
    this.scripts = sortByOrder(merge(this.scriptSources));
    this.onChange?.({
      robots: this.robots,
      modpacks: this.modpacks,
      repos: this.repos,
      scripts: this.scripts
    });
  }

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in to make changes.');
    return uid;
  }

  // ---- robots ----

  async addRobot(robot: NewRobot): Promise<string> {
    const uid = this.requireUid();
    const modpackPrivate = robot.modpackId
      ? this.modpacks.find((m) => m.id === robot.modpackId)?.private ?? false
      : false;
    const ref = await addDoc(collection(this.db, 'robots'), {
      ...robot,
      modpackPrivate,
      ownerUid: uid,
      order: nextOrder(this.robots),
      createdAt: Date.now()
    });
    return ref.id;
  }

  async updateRobot(id: string, patch: Partial<Robot>): Promise<void> {
    this.requireUid();
    const { id: _drop, ...rest } = patch; // never try to write the id as a field
    await updateDoc(doc(this.db, 'robots', id), rest as Record<string, unknown>);
  }

  async deleteRobot(id: string): Promise<void> {
    this.requireUid();
    await deleteDoc(doc(this.db, 'robots', id));
  }

  // ---- modpacks ----

  async addModpack(pack: NewModpack): Promise<string> {
    const uid = this.requireUid();
    const ref = await addDoc(collection(this.db, 'modpacks'), {
      ...pack,
      ownerUid: uid,
      order: nextOrder(this.modpacks),
      createdAt: Date.now()
    });
    return ref.id;
  }

  async updateModpack(id: string, patch: Partial<Modpack>): Promise<void> {
    this.requireUid();
    const { id: _drop, ...rest } = patch;
    await updateDoc(doc(this.db, 'modpacks', id), rest as Record<string, unknown>);
  }

  async setModpackPrivacy(id: string, isPrivate: boolean): Promise<void> {
    const uid = this.requireUid();
    // A batch commits all writes atomically (all-or-nothing, like a transaction).
    const batch = writeBatch(this.db);
    batch.update(doc(this.db, 'modpacks', id), { private: isPrivate });
    // Query the server (not just local state) so we catch every member robot.
    const snap = await getDocs(
      query(collection(this.db, 'robots'), where('ownerUid', '==', uid), where('modpackId', '==', id))
    );
    snap.forEach((d) => batch.update(d.ref, { modpackPrivate: isPrivate }));
    await batch.commit();
  }

  async deleteModpack(id: string): Promise<void> {
    const uid = this.requireUid();
    const batch = writeBatch(this.db);
    batch.delete(doc(this.db, 'modpacks', id));
    const snap = await getDocs(
      query(collection(this.db, 'robots'), where('ownerUid', '==', uid), where('modpackId', '==', id))
    );
    snap.forEach((d) => batch.update(d.ref, { modpackId: null, modpackPrivate: false }));
    await batch.commit();
  }

  async setRobotModpack(robotId: string, modpackId: string | null): Promise<void> {
    this.requireUid();
    const modpackPrivate = modpackId
      ? this.modpacks.find((m) => m.id === modpackId)?.private ?? false
      : false;
    await updateDoc(doc(this.db, 'robots', robotId), { modpackId, modpackPrivate });
  }

  // ---- repos ----

  async addRepo(repo: NewRepo): Promise<string> {
    const uid = this.requireUid();
    const ref = await addDoc(collection(this.db, 'repos'), {
      ...repo,
      scan: null,
      ownerUid: uid,
      order: nextOrder(this.repos),
      createdAt: Date.now()
    });
    return ref.id;
  }

  async updateRepo(id: string, patch: Partial<Repo>): Promise<void> {
    this.requireUid();
    const { id: _drop, ...rest } = patch;
    await updateDoc(doc(this.db, 'repos', id), rest as Record<string, unknown>);
  }

  async deleteRepo(id: string): Promise<void> {
    const uid = this.requireUid();
    const batch = writeBatch(this.db);
    batch.delete(doc(this.db, 'repos', id));
    const snap = await getDocs(
      query(collection(this.db, 'robots'), where('ownerUid', '==', uid), where('repoId', '==', id))
    );
    snap.forEach((d) => batch.update(d.ref, { repoId: null }));
    await batch.commit();
  }

  async saveRepoScan(id: string, scan: RepoScan): Promise<void> {
    await this.updateRepo(id, { scan });
  }

  // ---- script library ----

  async addScript(script: NewScript): Promise<string> {
    const uid = this.requireUid();
    const ref = await addDoc(collection(this.db, 'scripts'), {
      ...script,
      ownerUid: uid,
      order: nextOrder(this.scripts),
      createdAt: Date.now()
    });
    return ref.id;
  }

  async updateScript(id: string, patch: Partial<ScriptDoc>): Promise<void> {
    this.requireUid();
    const { id: _drop, ...rest } = patch;
    await updateDoc(doc(this.db, 'scripts', id), rest as Record<string, unknown>);
  }

  async deleteScript(id: string): Promise<void> {
    this.requireUid();
    await deleteDoc(doc(this.db, 'scripts', id));
  }

  // ---- auth ----

  async signIn(): Promise<void> {
    const provider = new GoogleAuthProvider();
    // Opens the Google account chooser in a popup window.
    await signInWithPopup(this.auth, provider, browserPopupRedirectResolver);
  }

  async signOut(): Promise<void> {
    await fbSignOut(this.auth);
  }
}
