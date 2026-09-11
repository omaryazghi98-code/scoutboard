import { getPlayerFootballdata, nextFixturesFootballdata, searchPlayersFootballdata } from './footballdata-provider';
import { nextFixturesOpenFoot, searchPlayersOpenFoot } from './openfoot-provider';

const BASE_URL = process.env.FOOTBALL_API_BASE_URL || 'https://v3.football.api-sports.io';

type PlayerResponse = { player: { id: number; name: string; nationality?: string | null; photo?: string | null; position?: string | null }; statistics?: Array<{ team?: { id?: number; name?: string; logo?: string } }> };
type FixtureResponse = { fixture: { id: number; date: string; timezone: string; venue?: { name?: string | null; city?: string | null } | null }; league: { id: number; name: string; country: string; logo?: string | null }; teams: { home: { id: number; name: string; logo?: string | null }; away: { id: number; name: string; logo?: string | null } } };
type ProviderResponse<T> = { response?: T[]; errors?: Record<string, unknown> };

async function apiFootballRequest<T>(path: string, apiKey?: string): Promise<T[]> {
  const key = apiKey?.trim() || process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error('API-Football key is not configured');
  const response = await fetch(`${BASE_URL}${path}`, { headers: { 'x-apisports-key': key }, next: { revalidate: 300 } });
  const data = (await response.json()) as ProviderResponse<T>;
  if (!response.ok || (data.errors && Object.keys(data.errors).length > 0)) throw new Error(Object.values(data.errors || {}).map(String).join('; ') || `API-Football request failed (${response.status})`);
  return data.response ?? [];
}

export type ProviderName = 'api-football' | 'footballdata' | 'openfoot';

export async function searchPlayers(query: string, leagueId: number, season: number, apiKey?: string, provider: ProviderName = 'api-football') {
  if (provider === 'footballdata') return searchPlayersFootballdata(query, apiKey || '');
  if (provider === 'openfoot') return searchPlayersOpenFoot(query, apiKey || '');
  const params = new URLSearchParams({ search: query.trim(), league: String(leagueId), season: String(season) });
  return apiFootballRequest<PlayerResponse>(`/players?${params.toString()}`, apiKey);
}

export async function getPlayerProfile(playerId: number | string, provider: ProviderName, apiKey?: string) {
  if (provider === 'footballdata') return getPlayerFootballdata(playerId, apiKey || '');
  if (provider === 'api-football') {
    const rows = await apiFootballRequest<PlayerResponse>(`/players?id=${encodeURIComponent(String(playerId))}`, apiKey);
    return rows[0] || null;
  }
  return null;
}

export async function nextFixtures(teamId: number | string, count = 10, apiKey?: string, provider: ProviderName = 'api-football') {
  if (provider === 'footballdata') return nextFixturesFootballdata(teamId, apiKey || '');
  if (provider === 'openfoot') return nextFixturesOpenFoot(String(teamId), apiKey || '');
  return apiFootballRequest<FixtureResponse>(`/fixtures?team=${encodeURIComponent(String(teamId))}&next=${count}`, apiKey);
}
