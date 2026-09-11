const BASE_URL = 'https://openfootapi.com/v1';

async function request(path: string, apiKey: string) {
  if (!apiKey.trim()) throw new Error('OpenFootAPI key is not configured');
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey.trim()}` },
    next: { revalidate: 300 },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || `OpenFootAPI request failed (${response.status})`);
  return body?.data ?? body;
}

export async function searchPlayersOpenFoot(query: string, apiKey: string) {
  const data = await request(`/search?q=${encodeURIComponent(query.trim())}`, apiKey);
  return Array.isArray(data) ? data : Array.isArray(data?.players) ? data.players : [];
}

export async function nextFixturesOpenFoot(teamId: string, apiKey: string) {
  const data = await request(`/matches?team=${encodeURIComponent(teamId)}&status=scheduled`, apiKey);
  return Array.isArray(data) ? data : Array.isArray(data?.matches) ? data.matches : [];
}
