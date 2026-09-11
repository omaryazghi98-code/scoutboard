import { NextResponse } from 'next/server';
import { searchPlayers } from '../../../../lib/football-provider';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get('q')?.trim() || '';
  const league = Number(params.get('league'));
  const season = Number(params.get('season'));

  if (query.length < 3) return NextResponse.json({ players: [] });
  if (!Number.isInteger(league) || league <= 0) {
    return NextResponse.json({ players: [], error: 'Choose a competition before searching.' }, { status: 400 });
  }
  if (!Number.isInteger(season) || season < 2000 || season > 2100) {
    return NextResponse.json({ players: [], error: 'Invalid season.' }, { status: 400 });
  }

  try {
    const apiKey = request.headers.get('x-scoutboard-api-key') || undefined;
    const rows = await searchPlayers(query, league, season, apiKey);
    const players = rows.slice(0, 12).map((row) => ({
      id: String(row.player.id),
      providerId: row.player.id,
      name: row.player.name,
      team: row.statistics?.[0]?.team?.name || 'Unknown club',
      teamId: row.statistics?.[0]?.team?.id || null,
      teamLogo: row.statistics?.[0]?.team?.logo || null,
      position: row.player.position || 'Unknown',
      nationality: row.player.nationality || 'Unknown',
      photo: row.player.photo || null,
    }));
    return NextResponse.json({ players, league, season });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provider error';
    return NextResponse.json({ players: [], error: message }, { status: message.includes('not configured') ? 503 : 502 });
  }
}
