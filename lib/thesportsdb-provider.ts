const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123';

type SportsDbPlayer = {
  idPlayer?: string;
  strPlayer?: string;
  strTeam?: string | null;
  idTeam?: string | null;
  strPosition?: string | null;
  strNationality?: string | null;
  strThumb?: string | null;
  strCutout?: string | null;
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, { next: { revalidate: 900 } });
  if (!response.ok) throw new Error(`TheSportsDB request failed (${response.status})`);
  return (await response.json()) as T;
}

export async function searchPlayersTheSportsDB(query: string): Promise<SportsDbPlayer[]> {
  if (!query.trim()) return [];
  const payload = await request<{ player?: SportsDbPlayer[] }>(`/searchplayers.php?p=${encodeURIComponent(query.trim())}`);
  return Array.isArray(payload.player) ? payload.player : [];
}

export async function getPlayerTheSportsDB(playerId: string): Promise<SportsDbPlayer | null> {
  const payload = await request<{ players?: SportsDbPlayer[] }>(`/lookupplayer.php?id=${encodeURIComponent(playerId)}`);
  return payload.players?.[0] || null;
}
