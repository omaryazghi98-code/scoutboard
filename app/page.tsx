'use client';

import { useEffect, useMemo, useState } from 'react';

type Player = {
  id: string;
  providerId: number;
  name: string;
  team: string;
  teamId: number | null;
  teamLogo: string | null;
  position: string;
  nationality: string;
  photo: string | null;
};

type Fixture = {
  id: string;
  kickoff: string;
  timezone: string;
  venue: string | null;
  competition: string;
  home: { id: number; name: string; logo?: string | null };
  away: { id: number; name: string; logo?: string | null };
};

const STORAGE_KEY = 'scoutboard-watchlist';
const LEAGUE_STORAGE_KEY = 'scoutboard-search-league';
const SEASON = 2026;
const competitions = [
  { id: 39, name: 'Premier League' },
  { id: 140, name: 'LaLiga' },
  { id: 61, name: 'Ligue 1' },
  { id: 78, name: 'Bundesliga' },
  { id: 135, name: 'Serie A' },
  { id: 88, name: 'Eredivisie' },
  { id: 94, name: 'Primeira Liga' },
  { id: 307, name: 'Saudi Pro League' },
  { id: 253, name: 'MLS' },
];

function getApiKey() {
  try { return window.localStorage.getItem('scoutboard-api-football-key') || ''; } catch { return ''; }
}

export default function Home() {
  const [watchlist, setWatchlist] = useState<Player[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [notice, setNotice] = useState('');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [leagueId, setLeagueId] = useState(39);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setWatchlist(JSON.parse(saved));
      const savedLeague = Number(window.localStorage.getItem(LEAGUE_STORAGE_KEY));
      if (competitions.some((league) => league.id === savedLeague)) setLeagueId(savedLeague);
    } catch {}
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    const teamIds = [...new Set(watchlist.map((player) => player.teamId).filter((id): id is number => Boolean(id)))];
    if (!teamIds.length) {
      setFixtures([]);
      return;
    }

    let cancelled = false;
    Promise.all(teamIds.map((teamId) => fetch(`/api/fixtures/team?teamId=${teamId}`).then((res) => res.ok ? res.json() : { fixtures: [] }).catch(() => ({ fixtures: [] }))))
      .then((payloads) => {
        if (cancelled) return;
        const merged = payloads.flatMap((payload) => payload.fixtures as Fixture[]).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
        const unique = merged.filter((fixture, index, all) => all.findIndex((item) => item.id === fixture.id) === index);
        setFixtures(unique.slice(0, 12));
      });
    return () => { cancelled = true; };
  }, [watchlist]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setResults([]);
      setSearching(false);
      setSearchError('');
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const response = await fetch(`/api/players/search?q=${encodeURIComponent(term)}&league=${leagueId}&season=${SEASON}`, {
          signal: controller.signal,
          headers: getApiKey() ? { 'x-scoutboard-api-key': getApiKey() } : undefined,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Player search is unavailable.');
        setResults(data.players ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setResults([]);
        setSearchError(error instanceof Error ? error.message : 'Player search failed.');
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, leagueId]);

  const addPlayer = (player: Player) => {
    if (watchlist.some((item) => item.id === player.id)) {
      setNotice(`${player.name} is already on your watchlist.`);
      return;
    }
    setWatchlist((current) => [...current, player]);
    setNotice(`${player.name} added to your watchlist.`);
    setQuery('');
    setResults([]);
    setShowSearch(false);
  };

  const removePlayer = (id: string) => {
    const player = watchlist.find((item) => item.id === id);
    setWatchlist((current) => current.filter((item) => item.id !== id));
    if (player) setNotice(`${player.name} removed.`);
  };

  const changeLeague = (value: number) => {
    setLeagueId(value);
    window.localStorage.setItem(LEAGUE_STORAGE_KEY, String(value));
    setResults([]);
    setSearchError('');
  };

  const formatFixture = (kickoff: string) => {
    const date = new Date(kickoff);
    return {
      day: date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const watchedCount = watchlist.length;
  const teamCount = useMemo(() => new Set(watchlist.map((player) => player.teamId).filter(Boolean)).size, [watchlist]);

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="/">SCOUTBOARD <span>0.1</span></a>
        <nav>
          <a className="navActive" href="/">Board</a>
          <a href="/watchlist">Watchlist <b>{watchedCount}</b></a>
          <a href="/calendar">Calendar</a>
          <a href="/settings">Settings</a>
        </nav>
      </header>

      <section className="hero workspaceHero">
        <div>
          <div className="eyebrow">SCOUTING DESK / LIVE DATA</div>
          <h1>Your scouting schedule, <span className="accent">automated.</span></h1>
          <p>Track the players you care about. Scoutboard finds their clubs and upcoming fixtures, then turns your list into a focused scouting calendar.</p>
        </div>
        <div className="heroStat">
          <span className="eyebrow">WATCHING</span>
          <strong>{watchedCount}</strong>
          <small>{teamCount} club{teamCount === 1 ? '' : 's'} connected</small>
        </div>
      </section>

      <section className="commandBar">
        <button className="primaryButton" onClick={() => { setShowSearch(true); setNotice(''); }}>+ Add player</button>
        <a className="ghostButton" href="/watchlist">Open watchlist</a>
        <a className="ghostButton" href="/calendar">View calendar</a>
        {notice && <span className="notice">{notice}</span>}
      </section>

      <section className="sectionBlock">
        <div className="sectionHeader">
          <div><div className="eyebrow">YOUR BOARD</div><h2>Watchlist</h2></div>
          <button className="smallButton" onClick={() => setShowSearch(true)}>+ Player</button>
        </div>

        {watchlist.length === 0 ? (
          <article className="emptyCard">
            <div className="emptyMark">◎</div>
            <h3>Your board is empty.</h3>
            <p>Search the live player database and add the people you want to scout. Their current club becomes the starting point for match radar.</p>
            <button className="primaryButton" onClick={() => setShowSearch(true)}>Find players</button>
          </article>
        ) : (
          <div className="playerGrid">
            {watchlist.map((player, index) => (
              <article className="playerCard" key={player.id}>
                <div className="cardTop"><span className="rank">0{index + 1}</span><button className="iconButton" aria-label={`Remove ${player.name}`} onClick={() => removePlayer(player.id)}>×</button></div>
                {player.photo ? <img className="avatar playerPhoto" src={player.photo} alt="" /> : <div className="avatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>}
                <div className="playerName">{player.name}</div>
                <div className="playerMeta">{player.team} · {player.position}</div>
                <div className="cardFooter"><span>{player.nationality}</span><span className="statusPill">WATCHING</span></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="splitGrid">
        <article className="featureCard">
          <div className="eyebrow">MATCH RADAR / API-FOOTBALL</div>
          <h2>Upcoming matches</h2>
          <p>Live fixtures pulled from the clubs connected to your watchlist.</p>
          <div className="miniTimeline">
            {fixtures.length ? fixtures.slice(0, 6).map((fixture) => {
              const formatted = formatFixture(fixture.kickoff);
              const playersHere = watchlist.filter((player) => player.teamId === fixture.home.id || player.teamId === fixture.away.id);
              return <div key={fixture.id}><span>{formatted.day}<br />{formatted.date}</span><strong>{fixture.home.name} vs {fixture.away.name}<small>{playersHere.map((player) => player.name).join(', ')}</small></strong><em>{formatted.time}</em></div>;
            }) : <div className="timelineEmpty">Add a player to start the radar.</div>}
          </div>
        </article>
        <article className="featureCard">
          <div className="eyebrow">IPHONE CALENDAR</div>
          <h2>One calendar for your scouting days.</h2>
          <p>Export the matches around your watchlist now. The next calendar backend step will give you a private subscription feed that stays updated.</p>
          <div className="calendarPreview"><span>◎</span><div><strong>Scoutboard / My Players</strong><small>{fixtures.length} live fixtures in radar</small></div></div>
          <a className="ghostButton" href="/calendar">Open calendar</a>
        </article>
      </section>

      {showSearch && (
        <div className="modalBackdrop" onMouseDown={() => setShowSearch(false)}>
          <section className="searchModal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modalHeader"><div><div className="eyebrow">LIVE PLAYER DISCOVERY</div><h2>Add a player</h2></div><button className="iconButton" onClick={() => setShowSearch(false)}>×</button></div>
            <div className="searchScope"><label className="fieldLabel">Competition<select value={leagueId} onChange={(event) => changeLeague(Number(event.target.value))}>{competitions.map((league) => <option value={league.id} key={league.id}>{league.name}</option>)}</select></label><span className="scopeSeason mono">SEASON {SEASON}/{SEASON + 1}</span></div>
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player in this competition..." />
            <div className="searchResults">
              {!query.trim() && <div className="noResults">Choose a competition, then type at least 3 characters.</div>}
              {searching && <div className="noResults">Searching live data…</div>}
              {searchError && <div className="searchError">{searchError}<small>Check your API key in Settings, then try again.</small></div>}
              {!searching && !searchError && results.map((player) => {
                const alreadyAdded = watchlist.some((item) => item.id === player.id);
                return <button className="resultRow" key={`${player.id}-${player.teamId ?? 'team'}`} onClick={() => addPlayer(player)} disabled={alreadyAdded}>
                  {player.photo ? <img className="resultAvatar playerPhoto" src={player.photo} alt="" /> : <span className="resultAvatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>}
                  <span className="resultIdentity"><strong>{player.name}</strong><small>{player.team} · {player.position} · {player.nationality}</small></span>
                  <span className="resultAction">{alreadyAdded ? 'ADDED' : '+ ADD'}</span>
                </button>;
              })}
              {!searching && !searchError && query.trim().length >= 3 && results.length === 0 && <div className="noResults">No player results in this competition/season.</div>}
            </div>
            <div className="modalFoot"><span>Live provider data</span><span className="mono">API-Football → Scoutboard</span></div>
          </section>
        </div>
      )}
    </main>
  );
}
