import { NextResponse } from 'next/server';
import { ProviderName, searchPlayers } from '../../../../lib/football-provider';

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
    const rows = await searchPlayers(query, league, season, apiKey, provider);
    const players = (rows as any[]).slice(0, 12).map((row) => {
      const p = row.player || row;
      const team = row.statistics?.[0]?.team || row.team || {};
      return {
        id: String(p.id ?? p.player_id ?? row.player_id ?? row.id),
        providerId: p.id ?? p.player_id ?? row.player_id ?? row.id,
        name: p.name ?? p.player_name ?? row.player_name ?? row.name ?? 'Unknown player',
        team: team.name ?? team.team_name ?? 'Unknown club',
        teamId: team.id ?? team.team_id ?? null,
        teamLogo: team.logo ?? team.team_logo ?? null,
        position: p.position ?? 'Unknown',
        nationality: p.nationality ?? 'Unknown',
        photo: p.photo ?? p.image_url ?? p.image ?? null,
        provider,
      };
    }).filter((player) => player.id && player.id !== 'undefined');
    return NextResponse.json({ players, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provider error';
    return NextResponse.json({ players: [], error: message }, { status: message.toLowerCase().includes('not configured') ? 503 : 502 });
  }
}
