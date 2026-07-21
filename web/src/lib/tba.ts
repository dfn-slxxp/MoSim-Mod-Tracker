// The Blue Alliance team lookup, proxied through the server (GET
// /api/tba/team/:number) which holds the one shared TBA read key — users
// never enter their own. Requires being signed in (cookie on web, Bearer
// token on desktop).
import { isTauri, getServerUrl } from './desktop';

/**
 * Strip a rebuild suffix from a team number: "9483a" -> "9483".
 * Suffixes let you track multiple rebuilds of the same team ("9483a",
 * "9483b"); TBA only knows the plain number.
 */
export function baseTeamNumber(teamNumber: string): string {
  return (teamNumber.match(/^\d+/) ?? [''])[0];
}

/** Returns the team's nickname (short name) or null if the lookup fails. */
export async function fetchTeamName(teamNumber: string): Promise<string | null> {
  const num = baseTeamNumber(teamNumber.trim());
  if (!num) return null;
  try {
    const base = isTauri() ? await getServerUrl() : '';
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('mosim_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(`${base}/api/tba/team/${num}`, {
      headers,
      credentials: 'include',
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.nickname as string | null) ?? (data.name as string | null) ?? null;
  } catch {
    return null;
  }
}
