import { NextResponse } from 'next/server';
import { nextFixtures } from '../../../../lib/football-provider';

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get('teamId');
  const teamId = Number(value);
  if (!Number.isInteger(teamId) || teamId <= 0) return NextResponse.json({ fixtures: [], error: 'Invalid teamId' }, { status: 400 });
  try {
    const apiKey = request.headers.get('x-scoutboard-api-key') || undefined;
    const rows = await nextFixtures(teamId, 10, apiKey);
    const fixtures = rows.map((row) => ({
      id: String(row.fixture.id),
      kickoff: row.fixture.date,
      timezone: row.fixture.timezone,
      venue: row.fixture.venue?.name || row.fixture.venue?.city || null,
      competition: row.league.name,
      home: row.teams.home,
      away: row.teams.away,
    }));
    return NextResponse.json({ fixtures });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provider error';
    return NextResponse.json({ fixtures: [], error: message }, { status: message.includes('not configured') ? 503 : 502 });
  }
}
