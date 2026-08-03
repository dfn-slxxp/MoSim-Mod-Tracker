// ---------------------------------------------------------------------------
// Shared data shapes for the whole app.
// TypeScript note (coming from C#/Java): `interface` here is purely a
// compile-time shape check — it compiles away to nothing. `type X = 'a' | 'b'`
// is a "union type": a string that is only allowed to be one of those values
// (think enum, but it stays a plain string at runtime).
// ---------------------------------------------------------------------------

/**
 * Robot lifecycle. Single-person tracker, so there's no "Claimed" — a robot
 * is simply Planned until you actually start it in Unity.
 */
export type RobotStatus = 'planned' | 'in-unity' | 'semi-functional' | 'released';

export const GAMES = ['2025: Reefscape', '2026: Rebuilt'] as const;
export type GameName = (typeof GAMES)[number];

/** Mod type column from the community tracker. '' = not set. */
export type ModType = '' | 'team-made' | 'team-approved' | 'unofficial' | 'official' | 'base-game';

/** Display labels + pill colors for statuses (used by the table UI). */
export const STATUS_META: Record<RobotStatus, { label: string; className: string }> = {
  planned: { label: 'Planned', className: 'st-planned' },
  'in-unity': { label: 'In Unity', className: 'st-unity' },
  'semi-functional': { label: 'Semi-Functional', className: 'st-semi' },
  released: { label: 'Released', className: 'st-released' }
};

export const MODTYPE_META: Record<Exclude<ModType, ''>, { label: string; className: string }> = {
  'team-made': { label: 'Team-made', className: 'mt-teammade' },
  'team-approved': { label: 'Team-approved', className: 'mt-approved' },
  unofficial: { label: 'Unofficial', className: 'mt-unofficial' },
  official: { label: 'Official (dev-made)', className: 'mt-official' },
  'base-game': { label: 'Base Game', className: 'mt-basegame' }
};

/** Per-step saved progress: which sub-steps are checked + a freeform note. */
export interface StepProgress {
  subs: Record<string, boolean>; // sub-step id -> checked (like a HashMap<String, bool>)
  note: string;
}

export interface Robot {
  id: string;
  name: string;
  team: string;
  teamName?: string; // cached from TBA (team nickname)
  game: string;
  status: RobotStatus;
  modType: ModType;
  modpackId: string | null;
  /** Which repo this robot's files live in (id into the repos collection). */
  repoId: string | null;
  /** Robot-level privacy flag — private items need Google sign-in to view. */
  private: boolean;
  /**
   * Denormalized copy of the parent modpack's privacy flag. Firestore can't do
   * SQL-style joins in security rules, so "hide robots whose modpack is
   * private" only works if the flag is copied onto each robot doc.
   */
  modpackPrivate: boolean;
  ownerUid: string | null;
  notes: string;
  order: number;
  createdAt: number; // Unix ms timestamp (Date.now())
  progress: Record<string, StepProgress>; // step id -> progress
  /** Last built AI prompt (see AiScriptPanel) — persisted server-side so it survives reloads/cache clears. */
  aiPrompt?: string;
}

/** One robot folder found while scanning a repo on disk. */
export interface ScannedRobot {
  name: string; // folder name, usually the team number
  relPath: string; // path relative to the repo root
  lastModified: number; // Unix ms of the newest git commit (or file mtime fallback)
  scripts: string[]; // repo-relative paths of .cs files inside the folder
}

/** Result of a desktop-side repo scan, cached on the repo record. */
export interface RepoScan {
  scannedAt: number;
  robots: ScannedRobot[];
}

/** A git repo that contains robot mods. */
export interface Repo {
  id: string;
  name: string;
  /**
   * e.g. a GitHub URL — shown as a link everywhere.
   * (Where the repo lives on disk is a per-device fact kept in localStorage via
   * lib/repoPaths.ts, NOT stored here — this record syncs to the web + other
   * machines where an absolute path would be meaningless.)
   */
  remoteUrl: string;
  private: boolean;
  ownerUid: string | null;
  order: number;
  createdAt: number;
  /** Last scan result, synced so the web UI can show it too. Null = never scanned. */
  scan: RepoScan | null;
}

/**
 * A saved robot script (.cs) in your personal library. You drag these in
 * manually on the Scripts page; the AI tool feeds ALL of them to the model as
 * style/API examples, and they can be exported as a fine-tuning dataset.
 * In cloud mode scripts are always owner-only (never publicly readable).
 */
export interface ScriptDoc {
  id: string;
  name: string; // file name, e.g. Lynk.cs
  /** What the robot does — optional, but this becomes the "prompt" half of a training pair. */
  description: string;
  content: string;
  robotId: string | null; // optionally tied to a tracked robot
  ownerUid: string | null;
  order: number;
  createdAt: number;
}

/** One image/video attached to a modpack's public showcase page carousel. */
export interface ModpackMedia {
  id: string;
  type: 'image' | 'video';
  /** Path under /uploads, e.g. /uploads/modpacks/<id>/<uuid>.jpg */
  url: string;
}

/** An additional credited author on a modpack, added by the owner via email. */
export interface ModpackAuthor {
  uid: string;
  displayName: string;
  email: string;
}

/**
 * A robot credited on a modpack's showcase page that the site does NOT track
 * (no status/progress/steps) — e.g. someone else's mod bundled into the pack.
 * Exists only as data on the modpack; never appears as a Robot record.
 */
export interface ExternalRobot {
  id: string;
  team: string;
  /** Optional freeform note (robot name, what it does) shown in the owner's management panel. */
  name?: string;
}

export interface Modpack {
  id: string;
  name: string;
  game: string;
  description: string;
  private: boolean;
  ownerUid: string | null;
  order: number;
  createdAt: number;
  /** Show a public showcase page for this modpack at /packs/:slug. */
  hasPage?: boolean;
  /** User-chosen URL segment for the showcase page. Required when hasPage is true, unique across all modpacks. */
  slug?: string;
  /** Carousel media for the showcase page, in display order. */
  media?: ModpackMedia[];
  /** Other credited authors, added by the owner. The owner is always an author and isn't listed here. */
  coAuthors?: ModpackAuthor[];
  /** Untracked robots credited on the showcase page — see ExternalRobot. */
  externalRobots?: ExternalRobot[];
}

/** Editable public profile shown in the community directory. */
export interface UserProfile {
  displayName: string;
  instagram: string; // bare handle, no @ or URL
  discord: string;   // username
  /** False until the user saves their profile once (drives the setup prompt). */
  completed: boolean;
}

/** Sign-in providers supported by the server. */
export type AuthProvider = 'google' | 'github' | 'discord';

/** Which providers the server has credentials for (GET /api/auth/providers). */
export interface AuthProviderAvailability {
  google: boolean;
  github: boolean;
  discord: boolean;
}

/** A secondary sign-in account linked to the primary account. */
export interface LinkedAccount {
  sub: string;
  /** Email, or a provider handle when the account has no email (e.g. GitHub). */
  email: string;
  provider?: AuthProvider;
}

export interface UserInfo {
  uid: string;
  name: string; // displayName if set, else provider name
  /** Email signed in with; null for accounts whose provider gave no email. */
  email: string | null;
  /** The account's root email (may differ from `email` on a linked sign-in). */
  primaryEmail?: string;
  photo: string | null;
  /** True when this email is on the server's ADMIN_EMAILS allowlist. */
  admin?: boolean;
  /** Other accounts (any provider) that also sign into this account. */
  linked?: LinkedAccount[];
  /** The primary account's sign-in provider. */
  provider?: AuthProvider;
  profile?: UserProfile;
}

/** A public community member (GET /api/community) — users with public robots. */
export interface CommunityUser {
  uid: string;
  displayName: string;
  photo: string | null;
  instagram: string;
  discord: string;
  robotCount: number;
  games: string[];
}

/** One of a user's public mods (GET /api/community/:uid). */
export interface CommunityRobot {
  id: string;
  team: string;
  teamName: string | null;
  name: string;
  game: string;
  status: RobotStatus;
  modType: ModType;
  progress: Record<string, StepProgress>;
  createdAt: number;
}

/** A public user profile + their public mods (GET /api/community/:uid). */
export interface PublicProfile {
  user: {
    uid: string;
    displayName: string;
    photo: string | null;
    instagram: string;
    discord: string;
  };
  robots: CommunityRobot[];
}

/** A modpack showcase card (GET /api/packs) — public, only packs with hasPage. */
export interface PublicPack {
  id: string;
  slug: string;
  name: string;
  game: string;
  description: string;
  media: ModpackMedia[];
  /** Owner first, then co-authors. */
  authors: { uid: string; displayName: string }[];
  /**
   * One pill per unique base team number across every robot in the pack
   * (tracked + external, rebuild suffixes like "694a"/"694b" collapsed to
   * "694"), with the nickname resolved server-side via TBA. name is null
   * when TBA has no record or the lookup isn't configured.
   */
  teams: { number: string; name: string | null }[];
}

/** Admin view of a user (GET /api/admin/users) — includes hidden flag. */
export interface AdminUser {
  uid: string;
  displayName: string;
  email: string;
  photo: string | null;
  hidden: boolean;
  robotCount: number;
  publicRobotCount: number;
}

/** A server-stored custom theme created in the admin dashboard. */
export interface CustomTheme {
  id: string;    // e.g. 'custom-midnight' (always prefixed to avoid builtin clashes)
  label: string;
  icon: string;  // single emoji shown on the theme cycle button
  /** CSS variable overrides, keys WITHOUT the leading '--' (e.g. bg, panel, accent). */
  vars: Record<string, string>;
  /** Source colors the palette was generated from (editor round-trips these). */
  primary?: string;
  secondary?: string;
  mode?: 'dark' | 'light';
}

// `Omit<T, K>` = type T minus the listed fields. These are the shapes callers
// provide when creating records; the backend fills in the rest (ids, owner...).
export type NewRobot = Omit<Robot, 'id' | 'ownerUid' | 'order' | 'createdAt' | 'modpackPrivate'>;
export type NewModpack = Omit<Modpack, 'id' | 'ownerUid' | 'order' | 'createdAt'>;
export type NewRepo = Omit<Repo, 'id' | 'ownerUid' | 'order' | 'createdAt' | 'scan'>;
export type NewScript = Omit<ScriptDoc, 'id' | 'ownerUid' | 'order' | 'createdAt'>;

/**
 * Upgrade robots saved by older versions of this app (statuses used to be
 * 'active'/'complete') and fill in fields added later. Runs on every read so
 * old data keeps working without a migration script.
 */
export function normalizeRobot(r: Robot): Robot {
  const raw = r.status as string; // may hold legacy values from old saves
  let status = r.status;
  if (raw === 'active') status = 'in-unity';
  if (raw === 'claimed') status = 'planned'; // claimed-but-not-started == planned for one person
  if (raw === 'complete') status = 'released';
  return {
    ...r,
    status,
    modType: r.modType ?? '',
    repoId: r.repoId ?? null,
    modpackPrivate: r.modpackPrivate ?? false,
    progress: r.progress ?? {},
    notes: r.notes ?? '',
    teamName: r.teamName ?? undefined,
    aiPrompt: r.aiPrompt ?? ''
  };
}
