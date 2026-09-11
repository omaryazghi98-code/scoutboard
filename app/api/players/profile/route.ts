import { NextResponse } from 'next/server';
import { getPlayerProfile, ProviderName } from '../../../../lib/football-provider';

function normalizePlayer(row: any, provider: ProviderName, fallbackId: string) {
  const p = row?.player || row || {};
  const team = row?.statistics?.[0]?.team || row?.team || p.team || {};
  return {
    id: String(p.id ?? p.player_id ?? row?.player_id ?? fallbackId),
    providerId: p.id ?? p.player_id ?? row?.player_id ?? fallbackId,
    name: p.name ?? p.player_name ?? row?.player_name ?? row?.name ?? 'Unknown player',
    team: team.name ?? team.team_name ?? 'Unknown club',
    teamId: team.id ?? team.team_id ?? null,
    teamLogo: team.logo ?? team.team_logo ?? null,
    position: p.position ?? 'Unknown',
    nationality: p.nationality ?? 'Unknown',
    photo: p.photo ?? p.image_url ?? p.image ?? null,
    provider,
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const playerId = params.get('id')?.trim();
  const provider = (params.get('provider') || 'footballdata') as ProviderName;
  if (!playerId) return NextResponse.json({ error: 'Missing player id.' }, { status: 400 });
  if (!['api-football', 'footballdata', 'openfoot'].includes(provider)) return NextResponse.json({ error: 'Unknown provider.' }, { status: 400 });

  try {
    const apiKey = request.headers.get('x-scoutboard-api-key') || undefined;
    const row = await getPlayerProfile(playerId, provider, apiKey);
    if (!row) return NextResponse.json({ error: 'Player profile is unavailable for this provider.' }, { status: 404 });
    return NextResponse.json({ player: normalizePlayer(row, provider, playerId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provider error';
    return NextResponse.json({ error: message }, { status: message.toLowerCase().includes('not configured') ? 503 : 502 });
  }
}
