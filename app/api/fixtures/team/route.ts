import { NextResponse } from 'next/server';
import { ProviderName, nextFixtures } from '../../../../lib/football-provider';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const value = params.get('teamId') || '';
  const provider = (params.get('provider') || 'footballdata') as ProviderName;
  if (!['api-football', 'footballdata', 'openfoot'].includes(provider)) return NextResponse.json({ fixtures: [], error: 'Unknown provider.' }, { status: 400 });
  if (!value) return NextResponse.json({ fixtures: [], error: 'Missing teamId' }, { status: 400 });
  try {
    const apiKey = request.headers.get('x-scoutboard-api-key') || undefined;
    const rows = await nextFixtures(value, 10, apiKey, provider);
    const fixtures = (rows as any[]).slice(0, 20).map((row) => {
      const home = row.teams?.home || row.home_team || row.homeTeam || {};
      const away = row.teams?.away || row.away_team || row.awayTeam || {};
      const fixture = row.fixture || {};
      const league = row.league || {};
      return {
        id: String(row.match_id ?? row.id ?? fixture.id),
        kickoff: row.kickoffAt ?? row.match_date ? new Date(row.kickoffAt ?? row.match_date).toISOString() : fixture.date,
        timezone: fixture.timezone || 'UTC',
        venue: fixture.venue?.name || fixture.venue?.city || row.venue?.name || row.venue || null,
        competition: league.name || league.competition_name || row.competition?.name || 'Football',
        home: { id: home.id ?? home.team_id, name: home.name ?? home.team_name, logo: home.logo ?? home.team_logo },
        away: { id: away.id ?? away.team_id, name: away.name ?? away.team_name, logo: away.logo ?? away.team_logo },
      };
    }).filter((fixture) => fixture.id !== 'undefined' && fixture.kickoff && fixture.home.name && fixture.away.name);
    return NextResponse.json({ fixtures, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provider error';
    return NextResponse.json({ fixtures: [], error: message }, { status: message.toLowerCase().includes('not configured') ? 503 : 502 });
  }
}
