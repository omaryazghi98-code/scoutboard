import { NextResponse } from 'next/server';
import { ProviderName, getPlayerProfile, searchPlayers } from '../../../../lib/football-provider';

function normalize(row: any, provider: ProviderName) {
  const p = row?.player || row || {};
  const team = row?.statistics?.[0]?.team || row?.team || p.team || {};
  return {
    id: String(p.id ?? p.player_id ?? row?.player_id ?? row?.id ?? ''),
    providerId: p.id ?? p.player_id ?? row?.player_id ?? row?.id,
    name: p.name ?? p.player_name ?? row?.player_name ?? row?.name ?? 'Unknown player',
    team: team.name ?? team.team_name ?? 'Unknown club',
    teamId: team.id ?? team.team_id ?? null,
    teamLogo: team.logo ?? team.team_logo ?? null,
    position: p.position ?? row?.position ?? 'Unknown',
    nationality: p.nationality ?? row?.nationality ?? 'Unknown',
    photo: p.photo ?? p.image_url ?? p.image ?? null,
    provider,
  };
}

function nameMatches(name: string, query: string) {
  const normalizedName = name.toLocaleLowerCase().replace(/[^a-z0-9À-ž]+/gi, ' ').trim();
  const normalizedQuery = query.toLocaleLowerCase().replace(/[^a-z0-9À-ž]+/gi, ' ').trim();
  if (!normalizedQuery) return true;
  return normalizedName.includes(normalizedQuery) || normalizedQuery.split(' ').every((part) => normalizedName.includes(part));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get('q')?.trim() || '';
  const provider = (params.get('provider') || 'footballdata') as ProviderName;
  const league = Number(params.get('league') || 0);
  const season = Number(params.get('season') || 0);

  if (query.length < 2) return NextResponse.json({ players: [] });
  if (!['api-football', 'footballdata', 'openfoot'].includes(provider)) return NextResponse.json({ players: [], error: 'Unknown provider.' }, { status: 400 });
  if (provider === 'api-football' && (!Number.isInteger(league) || league <= 0 || !Number.isInteger(season) || season < 2000 || season > 2100)) {
    return NextResponse.json({ players: [], error: 'API-Football requires a valid competition and season.' }, { status: 400 });
  }

  try {
    const apiKey = request.headers.get('x-scoutboard-api-key') || undefined;
    const rawRows = await searchPlayers(query, league, season, apiKey, provider);
    const rows = Array.isArray(rawRows) ? rawRows : [];

    // Some providers can return broad results. Never show unrelated names to the user.
    const basicMatches = rows.map((row) => normalize(row, provider)).filter((player) => player.id && nameMatches(player.name, query)).slice(0, 12);

    // Footballdata's search records may not include a current team. Resolve only the
    // small set of true name matches so every selectable player has a usable team ID.
    const players = provider === 'footballdata'
      ? (await Promise.all(basicMatches.map(async (player) => {
          if (player.teamId) return player;
          try {
            const profile = await getPlayerProfile(player.providerId, provider, apiKey);
            return profile ? { ...player, ...normalize(profile, provider) } : null;
          } catch {
            return null;
          }
        }))).filter((player): player is NonNullable<typeof player> => Boolean(player?.teamId)).slice(0, 12)
      : basicMatches;

    return NextResponse.json({ players, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provider error';
    return NextResponse.json({ players: [], error: message }, { status: message.toLowerCase().includes('not configured') ? 503 : 502 });
  }
}
