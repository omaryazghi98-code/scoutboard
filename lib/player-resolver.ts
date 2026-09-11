import { getPlayerFootballdata, resolveTeamFootballdata, searchPlayersFootballdata } from './footballdata-provider';
import { searchPlayersGemini } from './gemini-provider';
import { getPlayerTheSportsDB, searchPlayersTheSportsDB } from './thesportsdb-provider';

export type ResolvedPlayer = {
  id: string;
  providerId: string;
  name: string;
  team: string;
  teamId: string | null;
  teamLogo: string | null;
  position: string;
  nationality: string;
  photo: string | null;
  provider: 'gemini';
  sourceProvider: 'resolver';
  sourceUrl?: string | null;
  identityConfidence: 'high' | 'medium';
  identitySources: string[];
};

type Candidate = Omit<ResolvedPlayer, 'provider' | 'sourceProvider' | 'identityConfidence' | 'identitySources'> & {
  source: string;
};

function normalize(value: unknown) {
  return String(value ?? '')
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function nameScore(name: string, query: string) {
  const a = normalize(name);
  const b = normalize(query);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b)) return 85;
  const queryParts = b.split(' ');
  const matched = queryParts.filter((part) => a.includes(part)).length;
  return Math.round((matched / queryParts.length) * 70);
}

function fromFootballdata(row: any, fallbackSource = 'footballdata'): Candidate | null {
  const player = row?.player || row || {};
  const team = row?.statistics?.[0]?.team || row?.team || player.team || {};
  const id = player.id ?? player.player_id ?? row?.player_id ?? row?.id;
  const name = player.name ?? player.player_name ?? row?.player_name ?? row?.name;
  if (id == null || !name) return null;
  return {
    id: String(id),
    providerId: String(id),
    name: String(name),
    team: String(team?.name ?? team?.team_name ?? 'Unknown club'),
    teamId: team?.id ?? team?.team_id ? String(team.id ?? team.team_id) : null,
    teamLogo: team?.logo ?? team?.team_logo ?? null,
    position: String(player.position ?? row?.position ?? 'Unknown'),
    nationality: String(player.nationality ?? row?.nationality ?? 'Unknown'),
    photo: player.photo ?? player.image_url ?? player.image ?? null,
    sourceUrl: null,
    source: fallbackSource,
  };
}

async function footballCandidates(query: string, apiKey?: string) {
  if (!apiKey) return [];
  try {
    const rows = await searchPlayersFootballdata(query, apiKey);
    const candidates = (Array.isArray(rows) ? rows : [])
      .map((row) => fromFootballdata(row))
      .filter((candidate): candidate is Candidate => Boolean(candidate))
      .sort((a, b) => nameScore(b.name, query) - nameScore(a.name, query))
      .slice(0, 4);

    return Promise.all(candidates.map(async (candidate) => {
      if (candidate.teamId) return candidate;
      try {
        const profile = await getPlayerFootballdata(candidate.providerId, apiKey);
        return fromFootballdata(profile) || candidate;
      } catch {
        return candidate;
      }
    }));
  } catch {
    return [];
  }
}

async function sportsDbCandidates(query: string) {
  try {
    const rows = await searchPlayersTheSportsDB(query);
    const candidates = rows
      .filter((row) => row.idPlayer && row.strPlayer)
      .sort((a, b) => nameScore(b.strPlayer || '', query) - nameScore(a.strPlayer || '', query))
      .slice(0, 3);

    return Promise.all(candidates.map(async (row) => {
      const details = row.idPlayer ? await getPlayerTheSportsDB(row.idPlayer).catch(() => row) : row;
      return {
        id: String(details?.idPlayer ?? row.idPlayer),
        providerId: String(details?.idPlayer ?? row.idPlayer),
        name: String(details?.strPlayer ?? row.strPlayer),
        team: String(details?.strTeam ?? row.strTeam ?? 'Unknown club'),
        teamId: details?.idTeam ?? row.idTeam ?? null,
        teamLogo: null,
        position: String(details?.strPosition ?? 'Unknown'),
        nationality: String(details?.strNationality ?? 'Unknown'),
        photo: details?.strCutout ?? details?.strThumb ?? row.strCutout ?? row.strThumb ?? null,
        sourceUrl: `https://www.thesportsdb.com/player/${details?.idPlayer ?? row.idPlayer}`,
        source: 'thesportsdb',
      } satisfies Candidate;
    }));
  } catch {
    return [];
  }
}

function mergeCandidates(query: string, football: Candidate[], sports: Candidate[]) {
  const merged = new Map<string, Candidate & { sources: string[]; score: number }>();
  for (const candidate of [...football, ...sports]) {
    const key = normalize(candidate.name);
    const score = nameScore(candidate.name, query);
    if (!key || score < 65) continue;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...candidate, sources: [candidate.source], score });
      continue;
    }
    existing.sources = Array.from(new Set([...existing.sources, candidate.source]));
    existing.score = Math.max(existing.score, score);
    if ((existing.team === 'Unknown club' || !existing.teamId) && candidate.team !== 'Unknown club') existing.team = candidate.team;
    if (!existing.teamId && candidate.teamId) existing.teamId = candidate.teamId;
    if (!existing.teamLogo && candidate.teamLogo) existing.teamLogo = candidate.teamLogo;
    if (existing.position === 'Unknown' && candidate.position !== 'Unknown') existing.position = candidate.position;
    if (existing.nationality === 'Unknown' && candidate.nationality !== 'Unknown') existing.nationality = candidate.nationality;
    if (!existing.photo && candidate.photo) existing.photo = candidate.photo;
  }
  return [...merged.values()].sort((a, b) => (b.sources.length - a.sources.length) || (b.score - a.score));
}

export async function resolvePlayers(query: string, options: { footballApiKey?: string; geminiApiKey?: string; geminiModel?: string }) {
  let football = await footballCandidates(query, options.footballApiKey);
  let sports = await sportsDbCandidates(query);
  let merged = mergeCandidates(query, football, sports);

  // Gemini is a fallback/disambiguator, not the source of truth. Only call it when
  // the football sources cannot confidently identify a player.
  if (!merged.length && options.geminiApiKey) {
    try {
      const aiCandidates = await searchPlayersGemini(query, options.geminiApiKey, options.geminiModel || 'gemini-3.8-flash', false);
      const names = aiCandidates.map((candidate) => candidate.name).filter(Boolean).slice(0, 3);
      const discovered = await Promise.all(names.map(async (name) => ({
        football: await footballCandidates(name, options.footballApiKey),
        sports: await sportsDbCandidates(name),
      })));
      football = discovered.flatMap((item) => item.football);
      sports = discovered.flatMap((item) => item.sports);
      merged = mergeCandidates(query, football, sports);
    } catch {}
  }

  if (!merged.length) return [];

  const withResolvedTeams = await Promise.all(merged.slice(0, 8).map(async (candidate) => {
    let team = candidate.team;
    let teamId = candidate.teamId ? String(candidate.teamId) : null;
    let teamLogo = candidate.teamLogo;
    if (!teamId && team !== 'Unknown club' && options.footballApiKey) {
      const resolved = await resolveTeamFootballdata(team, options.footballApiKey).catch(() => null);
      if (resolved) {
        team = resolved.name;
        teamId = resolved.id;
        teamLogo = resolved.logo || teamLogo;
      }
    }

    const highConfidence = candidate.sources.includes('footballdata') && candidate.sources.includes('thesportsdb') && Boolean(teamId);
    return {
      id: `resolver:${normalize(candidate.name)}`,
      providerId: candidate.providerId,
      name: candidate.name,
      team,
      teamId,
      teamLogo,
      position: candidate.position,
      nationality: candidate.nationality,
      photo: candidate.photo,
      provider: 'gemini' as const,
      sourceProvider: 'resolver' as const,
      sourceUrl: candidate.sourceUrl,
      identityConfidence: highConfidence ? 'high' as const : 'medium' as const,
      identitySources: candidate.sources,
    } satisfies ResolvedPlayer;
  }));

  return withResolvedTeams;
}
