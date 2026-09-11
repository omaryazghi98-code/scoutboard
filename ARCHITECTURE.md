# Scoutboard architecture

## Product flow
Search player -> add to watchlist -> resolve current team -> sync upcoming fixtures -> attach watched player(s) to each relevant fixture -> serve private ICS feed.

## Data ownership
The database owns watchlist state, calendar preferences, provider IDs, normalized teams/players/fixtures, and private calendar tokens. Providers are an ingestion layer only.

## Providers
Sportmonks is the preferred first integration because its Football API centers fixtures and supports player/team data, lineups, player statistics, and TV stations tied to fixtures. API-Football remains a viable secondary provider.

## Calendar
Use a private RFC 5545 calendar endpoint. Each event should include the fixture, watched player, venue, competition, and available broadcast information. A future native iOS companion could use EventKit to create local events with alarms directly; the web app should not require that for the first release.

## Safety / reliability
Do not scrape SofaScore for the production data pipeline. SofaScore states that it does not provide its data sources as API endpoints, and the internal endpoints are undocumented. Use SofaScore as a UX/data-model reference, not as the production dependency.
