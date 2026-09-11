'use client';

import { useEffect, useMemo, useState } from 'react';

type Provider = 'api-football' | 'footballdata' | 'openfoot';
type Player = { id: string; providerId: number | string; name: string; team: string; teamId: number | string | null; teamLogo: string | null; position: string; nationality: string; photo: string | null; provider?: Provider };
type Fixture = { id: string; kickoff: string; timezone: string; venue: string | null; competition: string; home: { id: number | string; name: string; logo?: string | null }; away: { id: number | string; name: string; logo?: string | null } };

const STORAGE_KEY = 'scoutboard-watchlist';
const PROVIDER_KEY = 'scoutboard-provider';
const KEY_NAMES: Record<Provider, string> = { footballdata: 'scoutboard-footballdata-key', openfoot: 'scoutboard-openfoot-key', 'api-football': 'scoutboard-api-football-key' };
const LEAGUE_STORAGE_KEY = 'scoutboard-search-league';
const SEASON = 2024;
const competitions = [
  { id: 39, name: 'Premier League' }, { id: 140, name: 'LaLiga' }, { id: 61, name: 'Ligue 1' }, { id: 78, name: 'Bundesliga' }, { id: 135, name: 'Serie A' }, { id: 88, name: 'Eredivisie' }, { id: 94, name: 'Primeira Liga' }, { id: 307, name: 'Saudi Pro League' }, { id: 253, name: 'MLS' },
];
function getProvider(): Provider { try { const value = window.localStorage.getItem(PROVIDER_KEY) as Provider | null; return value && ['api-football','footballdata','openfoot'].includes(value) ? value : 'footballdata'; } catch { return 'footballdata'; } }
function getApiKey(provider: Provider) { try { return window.localStorage.getItem(KEY_NAMES[provider]) || ''; } catch { return ''; } }
function saveWatchlist(players: Player[]) { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(players)); } catch {} }

export default function Home() {
  const [watchlist, setWatchlist] = useState<Player[]>([]), [provider, setProviderState] = useState<Provider>('footballdata');
  const [query, setQuery] = useState(''), [results, setResults] = useState<Player[]>([]), [showSearch, setShowSearch] = useState(false), [searching, setSearching] = useState(false), [searchError, setSearchError] = useState(''), [notice, setNotice] = useState('');
  const [fixtures, setFixtures] = useState<Fixture[]>([]), [fixtureLoading, setFixtureLoading] = useState(false), [fixtureError, setFixtureError] = useState('');
  const [leagueId, setLeagueId] = useState(39);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed: Player[] = saved ? JSON.parse(saved) : [];
      setWatchlist(parsed);
      const activeProvider = getProvider();
      setProviderState(activeProvider);
      const savedLeague = Number(window.localStorage.getItem(LEAGUE_STORAGE_KEY));
      if (competitions.some((league) => league.id === savedLeague)) setLeagueId(savedLeague);

      // Repair legacy Footballdata entries by searching by name, not by the old/possibly invalid player id.
      const unresolved = parsed.filter((player) => player.provider === 'footballdata' && !player.teamId && player.name);
      if (unresolved.length) {
        Promise.all(unresolved.map(async (player) => {
          try {
            const key = getApiKey('footballdata');
            if (!key) return null;
            const response = await fetch(`/api/players/search?q=${encodeURIComponent(player.name)}&provider=footballdata`, { headers: { 'x-scoutboard-api-key': key } });
            const data = await response.json();
            const match = (data.players || []).find((candidate: Player) => candidate.teamId);
            return match ? { ...player, ...match, provider: 'footballdata' as Provider } : null;
          } catch { return null; }
        })).then((resolved) => {
          const byLegacyId = new Map(resolved.filter(Boolean).map((player) => [String(player!.id), player!]));
          if (!byLegacyId.size) return;
          setWatchlist((current) => {
            const next = current.map((player) => byLegacyId.get(String(player.id)) || player);
            saveWatchlist(next);
            return next;
          });
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    saveWatchlist(watchlist);
    const groups = new Map<Provider, Set<string>>();
    watchlist.forEach((player) => { if (!player.teamId) return; const p = player.provider || provider; if (!groups.has(p)) groups.set(p, new Set()); groups.get(p)!.add(String(player.teamId)); });
    if (!groups.size) { setFixtures([]); setFixtureLoading(false); setFixtureError(''); return; }
    let cancelled = false; setFixtureLoading(true); setFixtureError('');
    Promise.all([...groups.entries()].flatMap(([p, ids]) => [...ids].map((teamId) => fetch(`/api/fixtures/team?teamId=${encodeURIComponent(teamId)}&provider=${p}`, { headers: getApiKey(p) ? { 'x-scoutboard-api-key': getApiKey(p) } : undefined }).then(async (res) => { const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || `Fixture request failed (${res.status})`); return data; }))))
      .then((payloads) => { if (cancelled) return; const merged = payloads.flatMap((payload) => payload.fixtures as Fixture[]).filter(Boolean).sort((a, b) => a.kickoff.localeCompare(b.kickoff)); const unique = merged.filter((fixture, index, all) => all.findIndex((item) => `${item.id}` === `${fixture.id}`) === index); setFixtures(unique.slice(0, 12)); })
      .catch((error) => { if (!cancelled) { setFixtures([]); setFixtureError(error instanceof Error ? error.message : 'Unable to load fixtures.'); } }).finally(() => { if (!cancelled) setFixtureLoading(false); });
    return () => { cancelled = true; };
  }, [watchlist, provider]);

  useEffect(() => {
    const term = query.trim(); if (term.length < 2) { setResults([]); setSearching(false); setSearchError(''); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => { setSearching(true); setSearchError(''); try { const params = new URLSearchParams({ q: term, provider }); if (provider === 'api-football') { params.set('league', String(leagueId)); params.set('season', String(SEASON)); } const key = getApiKey(provider); const response = await fetch(`/api/players/search?${params.toString()}`, { signal: controller.signal, headers: key ? { 'x-scoutboard-api-key': key } : undefined }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Player search is unavailable.'); setResults((data.players ?? []).map((player: Player) => ({ ...player, provider }))); } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; setResults([]); setSearchError(error instanceof Error ? error.message : 'Player search failed.'); } finally { setSearching(false); } }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, leagueId, provider]);

  const addPlayer = async (player: Player) => {
    if (watchlist.some((item) => item.provider === player.provider && String(item.id) === String(player.id))) { setNotice(`${player.name} is already on your watchlist.`); return; }
    let enriched = player;
    if (player.provider === 'footballdata' && !player.teamId) {
      try {
        const key = getApiKey('footballdata');
        if (key) {
          const response = await fetch(`/api/players/profile?id=${encodeURIComponent(String(player.providerId))}&provider=footballdata`, { headers: { 'x-scoutboard-api-key': key } });
          const data = await response.json();
          if (response.ok && data.player) enriched = { ...player, ...data.player };
        }
      } catch {}
    }
    setWatchlist((current) => [...current, enriched]);
    setNotice(`${enriched.name} added${enriched.teamId ? ` — ${enriched.team}` : ' — club unresolved'}.`);
    setQuery(''); setResults([]); setShowSearch(false);
  };

  const removePlayer = (id: string) => { const player = watchlist.find((item) => item.id === id); setWatchlist((current) => current.filter((item) => item.id !== id)); if (player) setNotice(`${player.name} removed.`); };
  const changeLeague = (value: number) => { setLeagueId(value); window.localStorage.setItem(LEAGUE_STORAGE_KEY, String(value)); setResults([]); setSearchError(''); };
  const formatFixture = (kickoff: string) => { const date = new Date(kickoff); return { day: date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(), date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }; };
  const watchedCount = watchlist.length; const teamCount = useMemo(() => new Set(watchlist.map((player) => String(player.teamId)).filter(Boolean)).size, [watchlist]); const providerLabel = provider === 'footballdata' ? 'FOOTBALLDATA.IO' : provider === 'openfoot' ? 'OPENFOOTAPI' : 'API-FOOTBALL';

  return <main className="workspace"><header className="topbar"><a className="brand" href="/">SCOUTBOARD <span>0.1</span></a><nav><a className="navActive" href="/">Board</a><a href="/watchlist">Watchlist <b>{watchedCount}</b></a><a href="/calendar">Calendar</a><a href="/settings">Settings</a></nav></header>
    <section className="hero workspaceHero"><div><div className="eyebrow">SCOUTING DESK / {providerLabel}</div><h1>Your scouting schedule, <span className="accent">automated.</span></h1><p>Track players, discover fixtures, and turn the people you care about into a focused scouting calendar.</p></div><div className="heroStat"><span className="eyebrow">WATCHING</span><strong>{watchedCount}</strong><small>{teamCount} club{teamCount === 1 ? '' : 's'} connected</small></div></section>
    <section className="commandBar"><button className="primaryButton" onClick={() => { setShowSearch(true); setNotice(''); }}>+ Add player</button><a className="ghostButton" href="/watchlist">Open watchlist</a><a className="ghostButton" href="/calendar">View calendar</a>{notice && <span className="notice">{notice}</span>}</section>
    <section className="sectionBlock"><div className="sectionHeader"><div><div className="eyebrow">YOUR BOARD</div><h2>Watchlist</h2></div><button className="smallButton" onClick={() => setShowSearch(true)}>+ Player</button></div>{watchlist.length === 0 ? <article className="emptyCard"><div className="emptyMark">◎</div><h3>Your board is empty.</h3><p>Search the live player database and add the people you want to scout.</p><button className="primaryButton" onClick={() => setShowSearch(true)}>Find players</button></article> : <div className="playerGrid">{watchlist.map((player, index) => <article className="playerCard" key={`${player.provider}-${player.id}`}><div className="cardTop"><span className="rank">0{index + 1}</span><button className="iconButton" onClick={() => removePlayer(player.id)}>×</button></div>{player.photo ? <img className="avatar playerPhoto" src={player.photo} alt="" /> : <div className="avatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>}<div className="playerName">{player.name}</div><div className="playerMeta">{player.team} · {player.position}</div><div className="cardFooter"><span>{player.nationality}</span><span className="statusPill">{player.provider === 'footballdata' ? 'FD.IO' : player.provider === 'openfoot' ? 'OPENFOOT' : 'API-FB'}</span></div></article>)}</div>}</section>
    <section className="splitGrid"><article className="featureCard"><div className="eyebrow">MATCH RADAR / LIVE</div><h2>Upcoming matches</h2><p>Fixtures pulled directly from the clubs connected to your watchlist.</p><div className="miniTimeline">{fixtureLoading && <div className="timelineEmpty">Loading fixtures…</div>}{!fixtureLoading && fixtureError && <div className="timelineEmpty">{fixtureError}</div>}{!fixtureLoading && !fixtureError && fixtures.map((fixture) => { const formatted = formatFixture(fixture.kickoff); const playersHere = watchlist.filter((player) => String(player.teamId) === String(fixture.home.id) || String(player.teamId) === String(fixture.away.id)); return <div key={fixture.id}><span>{formatted.day}<br />{formatted.date}</span><strong>{fixture.home.name} vs {fixture.away.name}<small>{playersHere.map((player) => player.name).join(', ')}</small></strong><em>{formatted.time}</em></div>; })}{!fixtureLoading && !fixtureError && !fixtures.length && <div className="timelineEmpty">No upcoming club fixtures found yet.</div>}</div></article><article className="featureCard"><div className="eyebrow">IPHONE CALENDAR</div><h2>One calendar for your scouting days.</h2><p>Export the matches around your watchlist now. The live subscription feed comes next.</p><div className="calendarPreview"><span>◎</span><div><strong>Scoutboard / My Players</strong><small>{fixtures.length} live fixtures in radar</small></div></div><a className="ghostButton" href="/calendar">Open calendar</a></article></section>
    {showSearch && <div className="modalBackdrop" onMouseDown={() => setShowSearch(false)}><section className="searchModal" onMouseDown={(event) => event.stopPropagation()}><div className="modalHeader"><div><div className="eyebrow">LIVE PLAYER DISCOVERY / {providerLabel}</div><h2>Add a player</h2></div><button className="iconButton" onClick={() => setShowSearch(false)}>×</button></div>{provider === 'api-football' && <div className="searchScope"><label className="fieldLabel">Competition<select value={leagueId} onChange={(event) => changeLeague(Number(event.target.value))}>{competitions.map((league) => <option value={league.id} key={league.id}>{league.name}</option>)}</select></label><span className="scopeSeason mono">SEASON {SEASON}/{SEASON + 1}</span></div>}<input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={provider === 'api-football' ? 'Search player in this competition...' : 'Search any player...'} /><div className="searchResults">{!query.trim() && <div className="noResults">Type at least 2 characters to search.</div>}{searching && <div className="noResults">Searching live data…</div>}{searchError && <div className="searchError">{searchError}<small>Open Settings to switch provider or update its key.</small></div>}{!searching && !searchError && results.map((player) => <button className="resultRow" key={`${player.provider}-${player.id}-${player.teamId ?? 'team'}`} onClick={() => addPlayer(player)} disabled={watchlist.some((item) => item.provider === player.provider && String(item.id) === String(player.id))}>{player.photo ? <img className="resultAvatar playerPhoto" src={player.photo} alt="" /> : <span className="resultAvatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>}<span className="resultIdentity"><strong>{player.name}</strong><small>{player.team === 'Unknown club' ? 'Club will be resolved on add' : player.team} · {player.position} · {player.nationality}</small></span><span className="resultAction">{watchlist.some((item) => item.provider === player.provider && String(item.id) === String(player.id)) ? 'ADDED' : '+ ADD'}</span></button>)}{!searching && !searchError && query.trim().length >= 2 && results.length === 0 && <div className="noResults">No player results.</div>}</div><div className="modalFoot"><span>Live provider data</span><a className="mono" href="/settings">Change provider</a></div></section></div>}
  </main>;
}
