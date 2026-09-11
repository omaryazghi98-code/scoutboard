'use client';

import { useEffect, useMemo, useState } from 'react';

type Player = { id: string; name: string; team: string; position: string; nationality: string; photo?: string };
const STORAGE_KEY = 'scoutboard-watchlist';
const demoPlayers: Player[] = [
  { id: 'yamal', name: 'Lamine Yamal', team: 'Barcelona', position: 'RW', nationality: 'Spain' },
  { id: 'zaire-emery', name: 'Warren Zaïre-Emery', team: 'PSG', position: 'CM', nationality: 'France' },
  { id: 'saka', name: 'Bukayo Saka', team: 'Arsenal', position: 'RW', nationality: 'England' },
  { id: 'wirtz', name: 'Florian Wirtz', team: 'Liverpool', position: 'AM', nationality: 'Germany' },
  { id: 'doue', name: 'Désiré Doué', team: 'PSG', position: 'AM', nationality: 'France' },
  { id: 'cherki', name: 'Rayan Cherki', team: 'Manchester City', position: 'AM', nationality: 'France' },
];

export default function Home() {
  const [watchlist, setWatchlist] = useState<Player[]>([]);
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { try { const saved = window.localStorage.getItem(STORAGE_KEY); if (saved) setWatchlist(JSON.parse(saved)); } catch {} }, []);
  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist)); }, [watchlist]);
  const results = useMemo(() => { const term = query.trim().toLowerCase(); return term ? demoPlayers.filter((p) => `${p.name} ${p.team} ${p.position}`.toLowerCase().includes(term)) : demoPlayers; }, [query]);
  const addPlayer = (player: Player) => { if (watchlist.some((item) => item.id === player.id)) { setNotice(`${player.name} is already on your watchlist.`); return; } setWatchlist((current) => [...current, player]); setNotice(`${player.name} added to your watchlist.`); setQuery(''); };
  const removePlayer = (id: string) => { const player = watchlist.find((item) => item.id === id); setWatchlist((current) => current.filter((item) => item.id !== id)); if (player) setNotice(`${player.name} removed.`); };

  return <main className="workspace">
    <header className="topbar"><a className="brand" href="/">SCOUTBOARD <span>0.1</span></a><nav><a className="navActive" href="/">Board</a><a href="/watchlist">Watchlist <b>{watchlist.length}</b></a><a href="/calendar">Calendar</a></nav></header>
    <section className="hero workspaceHero"><div><div className="eyebrow">SCOUTING DESK / TODAY</div><h1>Your scouting schedule, <span className="accent">automated.</span></h1><p>Track the players you care about. Scoutboard finds the matches around them and turns your list into a personal match calendar.</p></div><div className="heroStat"><span className="eyebrow">WATCHING</span><strong>{watchlist.length}</strong><small>players on your board</small></div></section>
    <section className="commandBar"><button className="primaryButton" onClick={() => setShowSearch(true)}>+ Add player</button><a className="ghostButton" href="/watchlist">Open watchlist</a><a className="ghostButton" href="/calendar">View calendar</a>{notice && <span className="notice">{notice}</span>}</section>
    <section className="sectionBlock"><div className="sectionHeader"><div><div className="eyebrow">YOUR BOARD</div><h2>Watchlist</h2></div><button className="smallButton" onClick={() => setShowSearch(true)}>+ Player</button></div>{watchlist.length === 0 ? <article className="emptyCard"><div className="emptyMark">◎</div><h3>Your board is empty.</h3><p>Add the first player you want to follow. Their club becomes the starting point for the match radar.</p><button className="primaryButton" onClick={() => setShowSearch(true)}>Find players</button></article> : <div className="playerGrid">{watchlist.map((player, index) => <article className="playerCard" key={player.id}><div className="cardTop"><span className="rank">0{index + 1}</span><button className="iconButton" aria-label={`Remove ${player.name}`} onClick={() => removePlayer(player.id)}>×</button></div><div className="avatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="playerName">{player.name}</div><div className="playerMeta">{player.team} · {player.position}</div><div className="cardFooter"><span>{player.nationality}</span><span className="statusPill">WATCHING</span></div></article>)}</div>}</section>
    <section className="splitGrid"><article className="featureCard"><div className="eyebrow">MATCH RADAR</div><h2>Upcoming matches</h2><p>Add a player and Scoutboard will resolve their club fixtures into a focused scouting calendar.</p><div className="miniTimeline"><div><span>SAT 12</span><strong>Barcelona vs Real Madrid</strong><em>16:00</em></div><div><span>SUN 13</span><strong>PSG vs Marseille</strong><em>20:45</em></div><div><span>SUN 13</span><strong>Arsenal vs Chelsea</strong><em>16:30</em></div></div></article><article className="featureCard"><div className="eyebrow">IPHONE CALENDAR</div><h2>One calendar for your scouting days.</h2><p>Export the focused schedule today; later, subscribe once to a private feed so fixture changes flow through automatically.</p><div className="calendarPreview"><span>◎</span><div><strong>Scoutboard / My Players</strong><small>{watchlist.length ? `${watchlist.length} watched players` : 'Private calendar feed'}</small></div></div></article></section>
    {showSearch && <div className="modalBackdrop" onMouseDown={() => setShowSearch(false)}><section className="searchModal" onMouseDown={(event) => event.stopPropagation()}><div className="modalHeader"><div><div className="eyebrow">PLAYER DISCOVERY</div><h2>Add a player</h2></div><button className="iconButton" onClick={() => setShowSearch(false)}>×</button></div><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player or club..." /><div className="searchResults">{results.map((player) => { const alreadyAdded = watchlist.some((item) => item.id === player.id); return <button className="resultRow" key={player.id} onClick={() => addPlayer(player)} disabled={alreadyAdded}><span className="resultAvatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span className="resultIdentity"><strong>{player.name}</strong><small>{player.team} · {player.position} · {player.nationality}</small></span><span className="resultAction">{alreadyAdded ? 'ADDED' : '+ ADD'}</span></button>; })}{results.length === 0 && <div className="noResults">No matching player in the demo dataset.</div>}</div><div className="modalFoot"><span>Demo data for UI development</span><span className="mono">Provider API → next</span></div></section></div>}
  </main>;
}
