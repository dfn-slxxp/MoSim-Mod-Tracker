const KEY_STORAGE = 'mosim_tba_key';

export function getTbaKey(): string {
  return localStorage.getItem(KEY_STORAGE) ?? '';
}

export function setTbaKey(key: string): void {
  if (key.trim()) localStorage.setItem(KEY_STORAGE, key.trim());
  else localStorage.removeItem(KEY_STORAGE);
}

/**
 * Strip a rebuild suffix from a team number: "9483a" -> "9483".
 * Suffixes let you track multiple rebuilds of the same team ("9483a",
 * "9483b"); TBA only knows the plain number.
 */
export function baseTeamNumber(teamNumber: string): string {
  return (teamNumber.match(/^\d+/) ?? [''])[0];
}

/** Returns the team's nickname (short name) or null if lookup fails / no key. */
export async function fetchTeamName(teamNumber: string): Promise<string | null> {
  const key = getTbaKey();
  const num = baseTeamNumber(teamNumber.trim());
  if (!key || !num) return null;
  try {
    const resp = await fetch(
      `https://www.thebluealliance.com/api/v3/team/frc${num}`,
      { headers: { 'X-TBA-Auth-Key': key } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.nickname as string | null) ?? (data.name as string | null) ?? null;
  } catch {
    return null;
  }
}
