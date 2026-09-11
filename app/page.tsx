'use client';

import { useEffect, useMemo, useState } from 'react';

type Provider = 'api-football' | 'footballdata' | 'openfoot';
type Player = { id: string; providerId: number | string; name: string; team: string; teamId: number | string | null; teamLogo: string | null; position: string; nationality: string; photo: string | null; provider?: Provider; sourceProvider?: 'gemini' | Provider; sourceUrl?: string | null };
type Fixture = { id: string; kickoff: string; timezone: string; venue: string | null; competition: string; home: { id: number | string; name: string; logo?: string | null }; away: { id: number | string; name: string; logo?: string | null } };

const STORAGE_KEY = 'scoutboard-watchlist';
const FIXTURE_PROVIDER_KEY = 'scoutboard-fixture-provider';
const LEGACY_PROVIDER_KEY = 'scoutboard-provider';
const GEMINI_KEY = 'scoutboard-gemini-key';
const GEMINI_MODEL_KEY = 'scoutboard-gemini-model';
const KEY_NAMES: Record<Provider, string> = { footballdata: 'scoutboard-footballdata-key', openfoot: 'scoutboard-openfoot-key', 'api-football': 'scoutboard-api-football-key' };

function getFixtureProvider(): Provider {
  try {
    const value = window.localStorage.getItem(FIXTURE_PROVIDER_KEY) || window.localStorage.getItem(LEGACY_PROVIDER_KEY);
    return value && ['api-football', 'footballdata', 'openfoot'].includes(value) ? value as Provider : 'footballdata';
  } catch { return 'footballdata'; }
}
function getApiKey(provider: Provider) { try { return window.localStorage.getItem(KEY_NAMES[provider]) || ''; } catch { return ''; } }
function getGeminiKey() { try { return window.localStorage.getItem(GEMINI_KEY) || ''; } catch { return ''; } }
function getGeminiModel() { try { return window.localStorage.getItem(GEMINI_MODEL_KEY) || 'gemini-3.8-flash'; } catch { return 'gemini-3.8-flash'; } }
function saveWatchlist(players: Player[]) { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(players)); } catch {} }

export default function Home() {
  const [watchlist, setWatchlist] = useState<Player[]>([]), [provider, setProviderState] = useState<Provider>('footballdata');
  const [query, setQuery] = useState(''), [results, setResults] = useState<Player[]>([]), [showSearch, setShowSearch] = useState(false), [searching, setSearching] = useState(false), [searchError, setSearchError] = useState(''), [notice, setNotice] = useState('');
  const [fixtures, setFixtures] = useState<Fixture[]>([]), [fixtureLoading, setFixtureLoading] = useState(false), [fixtureError, setFixtureError] = useState('');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setWatchlist(saved ? JSON.parse(saved) : []);
      setProviderState(getFixtureProvider());
    } catch {}
  }, []);

  useEffect(() => {
    saveWatchlist(watchlist);
    const groups = new Map<Provider, Set<string>>();
    watchlist.forEach((player) => { if (!player.teamId || !player.provider) return; if (!groups.has(player.provider)) groups.set(player.provider, new Set()); groups.get(player.provider)!.add(String(player.teamId)); });
    if (!groups.size) { setFixtures([]); setFixtureLoading(false); setFixtureError(''); return; }
    let cancelled = false; setFixtureLoading(true); setFixtureError('');
    Promise.all([...groups.entries()].flatMap(([p, ids]) => [...ids].map((teamId) => fetch(`/api/fixtures/team?teamId=${encodeURIComponent(teamId)}&provider=${p}`, { headers: getApiKey(p) ? { 'x-scoutboard-api-key': getApiKey(p) } : undefined }).then(async (res) => { const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || `Fixture request failed (${res.status})`); return data; }))))
      .then((payloads) => { if (cancelled) return; const merged = payloads.flatMap((payload) => Array.isArray(payload.fixtures) ? payload.fixtures as Fixture[] : []).filter(Boolean).sort((a, b) => a.kickoff.localeCompare(b.kickoff)); const unique = merged.filter((fixture, index, all) => all.findIndex((item) => `${item.id}` === `${fixture.id}`) === index); setFixtures(unique.slice(0, 12)); })
      .catch((error) => { if (!cancelled) { setFixtures([]); setFixtureError(error instanceof Error ? error.message : 'Unable to load fixtures.'); } }).finally(() => { if (!cancelled) setFixtureLoading(false); });
    return () => { cancelled = true; };
  }, [watchlist]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setResults([]); setSearching(false); setSearchError(''); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true); setSearchError('');
      try {
        const geminiKey = getGeminiKey();
        if (!geminiKey) throw new Error('Gemini is not configured. Open Settings and add your Gemini API key.');
        const params = new URLSearchParams({ q: term, provider: 'gemini', model: getGeminiModel() });
        const response = await fetch(`/api/players/search?${params.toString()}`, { signal: controller.signal, headers: { 'x-scoutboard-gemini-key': geminiKey } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gemini player search is unavailable.');
        setResults((data.players ?? []).map((player: Player) => ({ ...player, provider, sourceProvider: 'gemini' as const })));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setResults([]); setSearchError(error instanceof Error ? error.message : 'Player search failed.');
      } finally { setSearching(false); }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, provider]);

  const addPlayer = async (player: Player) => {
    const fixtureProvider = provider;
    if (watchlist.some((item) => String(item.id) === String(player.id) && item.sourceProvider === 'gemini')) { setNotice(`${player.name} is already on your watchlist.`); return; }
    let teamId = player.teamId;
    let team = player.team;
    let teamLogo = player.teamLogo;
    if (!teamId && team && team !== 'Unknown club') {
      try {
        const key = getApiKey(fixtureProvider);
        if (key) {
          const response = await fetch(`/api/teams/resolve?name=${encodeURIComponent(team)}&provider=${fixtureProvider}`, { headers: { 'x-scoutboard-api-key': key } });
          const data = await response.json();
          if (response.ok && data.team?.id) { teamId = data.team.id; team = data.team.name || team; teamLogo = data.team.logo || teamLogo; }
        }
      } catch {}
    }
    const enriched: Player = { ...player, team, teamId, teamLogo, provider: fixtureProvider, sourceProvider: 'gemini' };
    setWatchlist((current) => [...current, enriched]);
    setNotice(`${enriched.name} added${enriched.teamId ? ` — ${enriched.team}` : ' — club found, fixture ID unresolved'}.`);
    setQuery(''); setResults([]); setShowSearch(false);
  };

  const removePlayer = (id: string) => { const player = watchlist.find((item) => item.id === id); setWatchlist((current) => current.filter((item) => item.id !== id)); if (player) setNotice(`${player.name} removed.`); };
  const formatFixture = (kickoff: string) => { const date = new Date(kickoff); return { day: date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(), date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }; };
  const watchedCount = watchlist.length; const teamCount = useMemo(() => new Set(watchlist.map((player) => `${player.provider}:${player.teamId}`).filter((value) => !value.endsWith(':null'))).size, [watchlist]); const providerLabel = provider === 'footballdata' ? 'FOOTBALLDATA.IO' : provider === 'openfoot' ? 'OPENFOOTAPI' : 'API-FOOTBALL';

  return <main className="workspace"><header className="topbar"><a className="brand" href="/">SCOUTBOARD <span>0.1</span></a><nav><a className="navActive" href="/">Board</a><a href="/watchlist">Watchlist <b>{watchedCount}</b></a><a href="/calendar">Calendar</a><a href="/settings">Settings</a></nav></header>
    <section className="hero workspaceHero"><div><div className="eyebrow">PLAYER DISCOVERY / GEMINI · MATCH DATA / {providerLabel}</div><h1>Your scouting schedule, <span className="accent">automated.</span></h1><p>Gemini discovers the player; the selected football provider resolves the club identity and powers fixtures.</p></div><div className="heroStat"><span className="eyebrow">WATCHING</span><strong>{watchedCount}</strong><small>{teamCount} club{teamCount === 1 ? '' : 's'} connected</small></div></section>
    <section className="commandBar"><button className="primaryButton" onClick={() => { setShowSearch(true); setNotice(''); }}>+ Add player</button><a className="ghostButton" href="/watchlist">Open watchlist</a><a className="ghostButton" href="/calendar">View calendar</a>{notice && <span className="notice">{notice}</span>}</section>
    <section className="sectionBlock"><div className="sectionHeader"><div><div className="eyebrow">YOUR BOARD</div><h2>Watchlist</h2></div><button className="smallButton" onClick={() => setShowSearch(true)}>+ Player</button></div>{watchlist.length === 0 ? <article className="emptyCard"><div className="emptyMark">◎</div><h3>Your board is empty.</h3><p>Search the live web with Gemini and add the players you want to scout.</p><button className="primaryButton" onClick={() => setShowSearch(true)}>Find players</button></article> : <div className="playerGrid">{watchlist.map((player, index) => <article className="playerCard" key={`${player.sourceProvider || player.provider}-${player.id}`}><div className="cardTop"><span className="rank">0{index + 1}</span><button className="iconButton" onClick={() => removePlayer(player.id)}>×</button></div>{player.photo ? <img className="avatar playerPhoto" src={player.photo} alt="" /> : <div className="avatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>}<div className="playerName">{player.name}</div><div className="playerMeta">{player.team} · {player.position}</div><div className="cardFooter"><span>{player.nationality}</span><span className="statusPill">GEMINI</span></div></article>)}</div>}</section>
    <section className="splitGrid"><article className="featureCard"><div className="eyebrow">MATCH RADAR / {providerLabel}</div><h2>Upcoming matches</h2><p>Fixtures are fetched from the resolved current club IDs.</p><div className="miniTimeline">{fixtureLoading && <div className="timelineEmpty">Loading fixtures…</div>}{!fixtureLoading && fixtureError && <div className="timelineEmpty">{fixtureError}</div>}{!fixtureLoading && !fixtureError && fixtures.map((fixture) => { const formatted = formatFixture(fixture.kickoff); const playersHere = watchlist.filter((player) => String(player.teamId) === String(fixture.home.id) || String(player.teamId) === String(fixture.away.id)); return <div key={fixture.id}><span>{formatted.day}<br />{formatted.date}</span><strong>{fixture.home.name} vs {fixture.away.name}<small>{playersHere.map((player) => player.name).join(', ')}</small></strong><em>{formatted.time}</em></div>; })}{!fixtureLoading && !fixtureError && !fixtures.length && <div className="timelineEmpty">No upcoming club fixtures found yet.</div>}</div></article><article className="featureCard"><div className="eyebrow">IPHONE CALENDAR</div><h2>One calendar for your scouting days.</h2><p>Export the matches around your watchlist now. The live subscription feed comes next.</p><div className="calendarPreview"><span>◎</span><div><strong>Scoutboard / My Players</strong><small>{fixtures.length} live fixtures in radar</small></div></div><a className="ghostButton" href="/calendar">Open calendar</a></article></section>
    {showSearch && <div className="modalBackdrop" onMouseDown={() => setShowSearch(false)}><section className="searchModal" onMouseDown={(event) => event.stopPropagation()}><div className="modalHeader"><div><div className="eyebrow">LIVE WEB DISCOVERY / GEMINI</div><h2>Add a player</h2></div><button className="iconButton" onClick={() => setShowSearch(false)}>×</button></div><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search any football player..." /><div className="searchResults">{!query.trim() && <div className="noResults">Type at least 2 characters to search.</div>}{searching && <div className="noResults">Gemini is searching…</div>}{searchError && <div className="searchError">{searchError}<small>Open Settings to configure Gemini.</small></div>}{!searching && !searchError && results.map((player) => <button className="resultRow" key={`${player.id}-${player.team}`} onClick={() => addPlayer(player)} disabled={watchlist.some((item) => String(item.id) === String(player.id) && item.sourceProvider === 'gemini')}><span className="resultAvatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span className="resultIdentity"><strong>{player.name}</strong><small>{player.team} · {player.position} · {player.nationality}</small></span><span className="resultAction">{watchlist.some((item) => String(item.id) === String(player.id) && item.sourceProvider === 'gemini') ? 'ADDED' : '+ ADD'}</span></button>)}{!searching && !searchError && query.trim().length >= 2 && results.length === 0 && <div className="noResults">No player results.</div>}</div><div className="modalFoot"><span>Powered by Gemini</span><a className="mono" href="/settings">Configure AI</a></div></section></div>}
  </main>;
}
