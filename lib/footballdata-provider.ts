const BASE_URL = 'https://footballdata.io/api/v1';

type ProviderResponse = { success?: boolean; data?: any; error?: { message?: string; code?: string } };

async function request(path: string, apiKey: string) {
  if (!apiKey.trim()) throw new Error('Footballdata.io API key is not configured');
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey.trim()}` },
    next: { revalidate: 300 },
  });
  const body = (await response.json()) as ProviderResponse;
  if (!response.ok || body.success === false) throw new Error(body.error?.message || `Footballdata.io request failed (${response.status})`);
  return body.data ?? body;
}

export async function searchPlayersFootballdata(query: string, apiKey: string) {
  const data = await request(`/players?q=${encodeURIComponent(query.trim())}&limit=12`, apiKey);
  return Array.isArray(data) ? data : Array.isArray(data?.players) ? data.players : Array.isArray(data?.results) ? data.results : [];
}

export async function getPlayerFootballdata(playerId: number | string, apiKey: string) {
  return request(`/players/${encodeURIComponent(String(playerId))}`, apiKey);
}

export async function resolveTeamFootballdata(name: string, apiKey: string) {
  const data = await request(`/teams?q=${encodeURIComponent(name.trim())}&limit=10`, apiKey);
  const teams = Array.isArray(data) ? data : Array.isArray(data?.teams) ? data.teams : Array.isArray(data?.results) ? data.results : [];
  const normalized = name.trim().toLocaleLowerCase();
  const ranked = teams
    .map((team: any) => ({
      id: team?.team_id ?? team?.id,
      name: team?.team_name ?? team?.name ?? team?.team_name_english ?? team?.short_name ?? '',
      logo: team?.team_logo ?? team?.logo ?? null,
    }))
    .filter((team: any) => team.id != null && team.name)
    .sort((a: any, b: any) => {
      const aName = a.name.toLocaleLowerCase();
      const bName = b.name.toLocaleLowerCase();
      if (aName === normalized) return -1;
      if (bName === normalized) return 1;
      if (aName.includes(normalized)) return -1;
      if (bName.includes(normalized)) return 1;
      return 0;
    });
  const team = ranked[0];
  return team ? { id: String(team.id), name: team.name, logo: team.logo } : null;
}

export async function nextFixturesFootballdata(teamId: number | string, apiKey: string) {
  const data = await request(`/fixtures/upcoming?team_id=${encodeURIComponent(String(teamId))}&limit=10`, apiKey);
  return Array.isArray(data) ? data : Array.isArray(data?.fixtures) ? data.fixtures : Array.isArray(data?.matches) ? data.matches : [];
}
