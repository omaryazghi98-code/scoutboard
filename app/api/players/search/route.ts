import { NextResponse } from 'next/server';
import { searchPlayers } from '../../../../lib/football-provider';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() || '';
  if (query.length < 2) return NextResponse.json({ players: [] });
  try {
    const rows = await searchPlayers(query);
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
    return NextResponse.json({ players });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provider error';
    return NextResponse.json({ players: [], error: message }, { status: message.includes('not configured') ? 503 : 502 });
  }
}
