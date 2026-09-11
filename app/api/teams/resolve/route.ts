import { NextResponse } from 'next/server';
import { resolveTeam, ProviderName } from '../../../../lib/football-provider';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const name = params.get('name')?.trim() || '';
  const provider = (params.get('provider') || 'footballdata') as ProviderName;
  const apiKey = request.headers.get('x-scoutboard-api-key') || '';

  if (name.length < 2) return NextResponse.json({ team: null, error: 'Team name is required.' }, { status: 400 });
  if (!['api-football', 'footballdata', 'openfoot'].includes(provider)) {
    return NextResponse.json({ team: null, error: 'Unknown provider.' }, { status: 400 });
  }

  try {
    const team = await resolveTeam(name, provider, apiKey);
    return NextResponse.json({ team });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to resolve team.';
    return NextResponse.json({ team: null, error: message }, { status: message.toLowerCase().includes('not configured') ? 503 : 502 });
  }
}
