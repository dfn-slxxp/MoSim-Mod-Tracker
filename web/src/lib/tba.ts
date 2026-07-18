const KEY_STORAGE = 'mosim_tba_key';

export function getTbaKey(): string {
  return localStorage.getItem(KEY_STORAGE) ?? '';
}

export function setTbaKey(key: string): void {
  if (key.trim()) localStorage.setItem(KEY_STORAGE, key.trim());
  else localStorage.removeItem(KEY_STORAGE);
}

/** Returns the team's nickname (short name) or null if lookup fails / no key. */
export async function fetchTeamName(teamNumber: string): Promise<string | null> {
  const key = getTbaKey();
  if (!key || !teamNumber.trim()) return null;
  try {
    const resp = await fetch(
      `https://www.thebluealliance.com/api/v3/team/frc${teamNumber.trim()}`,
      { headers: { 'X-TBA-Auth-Key': key } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.nickname as string | null) ?? (data.name as string | null) ?? null;
  } catch {
    return null;
  }
}
