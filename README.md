# Scoutboard

Personal football scouting calendar and watchlist.

Core loop:
1. Search for a player.
2. Add them to your watchlist.
3. Sync their team's upcoming fixtures.
4. Build a private scouting calendar feed.
5. Subscribe to that calendar from iPhone.

## Provider strategy
- Primary candidate: Sportmonks Football API — fixtures, player/team data, lineups, player statistics, TV stations.
- Secondary candidate: API-Football — fixtures, lineups, player match statistics and broad league coverage.
- Do not depend on SofaScore's undocumented internal API for production.

## Calendar strategy
- Generate RFC 5545 `.ics` feed.
- Give each user a private subscription URL.
- Keep events scoped to watched players.
- Include player name, match, competition, venue, and broadcaster data when available.
- Optionally add alarms for exported/imported calendar events.
