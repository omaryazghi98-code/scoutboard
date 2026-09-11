const BASE_URL = process.env.FOOTBALL_API_BASE_URL || 'https://v3.football.api-sports.io';

type PlayerResponse = {
  player: {
    id: number;
    name: string;
    age?: number | null;
    nationality?: string | null;
    photo?: string | null;
    position?: string | null;
  };
  statistics?: Array<{
    team?: { id?: number; name?: string; logo?: string };
  }>;
};

type FixtureResponse = {
  fixture: {
    id: number;
    date: string;
    timezone: string;
    venue?: { name?: string | null; city?: string | null } | null;
  };
  league: { id: number; name: string; country: string; logo?: string | null };
  teams: {
    home: { id: number; name: string; logo?: string | null };
    away: { id: number; name: string; logo?: string | null };
  };
};

type ProviderResponse<T> = { response?: T[]; errors?: Record<string, unknown> };

async function request<T>(path: string): Promise<T[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error('API_FOOTBALL_KEY is not configured');

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'x-apisports-key': key },
    next: { revalidate: 300 },
  });

  if (!response.ok) throw new Error(`Football provider request failed (${response.status})`);
  const data = (await response.json()) as ProviderResponse<T>;
  if (data.errors && Object.keys(data.errors).length > 0) throw new Error('Football provider returned an error');
  return data.response ?? [];
}

export async function searchPlayers(query: string) {
  return request<PlayerResponse>(`/players?search=${encodeURIComponent(query.trim())}`);
}

export async function nextFixtures(teamId: number, count = 10) {
  return request<FixtureResponse>(`/fixtures?team=${teamId}&next=${count}`);
}
