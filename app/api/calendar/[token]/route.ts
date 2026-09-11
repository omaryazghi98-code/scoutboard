import { NextResponse } from 'next/server';
import { buildScoutingCalendar } from '@/lib/calendar/ical';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return new NextResponse('Not found', { status: 404 });
  const sample = buildScoutingCalendar({ ownerName: 'Scoutboard', fixtures: [] });
  return new NextResponse(sample, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="scoutboard.ics"',
      'Cache-Control': 'private, max-age=300'
    }
  });
}
