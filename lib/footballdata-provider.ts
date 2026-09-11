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

export async function nextFixturesFootballdata(teamId: number | string, apiKey: string) {
  const data = await request(`/fixtures/upcoming?team_id=${encodeURIComponent(String(teamId))}&limit=10`, apiKey);
  return Array.isArray(data) ? data : Array.isArray(data?.fixtures) ? data.fixtures : Array.isArray(data?.matches) ? data.matches : [];
}
