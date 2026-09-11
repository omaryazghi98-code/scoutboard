'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'scoutboard-watchlist';
type Player = { id: string; name: string; team: string; position: string; nationality: string };

export default function WatchlistPage() {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    try { const saved = window.localStorage.getItem(STORAGE_KEY); if (saved) setPlayers(JSON.parse(saved)); } catch {}
  }, []);

  const remove = (id: string) => {
    const next = players.filter((player) => player.id !== id);
    setPlayers(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return <main className="workspace">
    <header className="topbar"><a className="brand" href="/">SCOUTBOARD <span>0.1</span></a><nav><a href="/">Board</a><a className="navActive" href="/watchlist">Watchlist <b>{players.length}</b></a><a href="/calendar">Calendar</a></nav></header>
    <section className="sectionBlock">
      <div className="sectionHeader"><div><div className="eyebrow">PLAYER BOARD</div><h2>My watchlist</h2></div><a className="smallButton" href="/">+ Add player</a></div>
      {players.length === 0 ? <article className="emptyCard"><div className="emptyMark">◎</div><h3>Nothing here yet.</h3><p>Use Add player on the board to start building your scouting list.</p><a className="primaryButton" href="/">Find players</a></article> : <div className="playerGrid">{players.map((player, index) => <article className="playerCard" key={player.id}><div className="cardTop"><span className="rank">0{index + 1}</span><button className="iconButton" onClick={() => remove(player.id)} aria-label={`Remove ${player.name}`}>×</button></div><div className="avatar">{player.name.split(' ').map((part) => part[0]).slice(0,2).join('')}</div><div className="playerName">{player.name}</div><div className="playerMeta">{player.team} · {player.position}</div><div className="cardFooter"><span>{player.nationality}</span><span className="statusPill">WATCHING</span></div></article>)}</div>}
    </section>
    <section className="featureCard pageCallout"><div><div className="eyebrow">NEXT</div><h2>Turn this list into a match calendar.</h2><p>Scoutboard will use each player’s current club to surface the fixtures you actually need to watch.</p></div><a className="primaryButton" href="/calendar">Open calendar</a></section>
  </main>;
}
