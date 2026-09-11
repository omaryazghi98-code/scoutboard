'use client';

import { useEffect, useState } from 'react';

const PROVIDER_KEY = 'scoutboard-provider';
const PROVIDER_KEYS = { footballdata: 'scoutboard-footballdata-key', openfoot: 'scoutboard-openfoot-key', 'api-football': 'scoutboard-api-football-key' } as const;
type Provider = keyof typeof PROVIDER_KEYS;

export default function SettingsPage() {
  const [provider, setProvider] = useState<Provider>('footballdata');
  const [keys, setKeys] = useState<Record<Provider, string>>({ footballdata: '', openfoot: '', 'api-football': '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => { try { const stored = window.localStorage.getItem(PROVIDER_KEY) as Provider | null; if (stored && PROVIDER_KEYS[stored]) setProvider(stored); setKeys({ footballdata: window.localStorage.getItem(PROVIDER_KEYS.footballdata) || '', openfoot: window.localStorage.getItem(PROVIDER_KEYS.openfoot) || '', 'api-football': window.localStorage.getItem(PROVIDER_KEYS['api-football']) || '' }); } catch {} }, []);
  const save = () => { window.localStorage.setItem(PROVIDER_KEY, provider); (Object.keys(PROVIDER_KEYS) as Provider[]).forEach((name) => { const value = keys[name].trim(); if (value) window.localStorage.setItem(PROVIDER_KEYS[name], value); else window.localStorage.removeItem(PROVIDER_KEYS[name]); }); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };

  const labels: Record<Provider, string> = { footballdata: 'Footballdata.io', openfoot: 'OpenFootAPI', 'api-football': 'API-Football' };
  return <main className="workspace">
    <header className="topbar"><a className="brand" href="/">SCOUTBOARD <span>0.1</span></a><nav><a href="/">Board</a><a href="/watchlist">Watchlist</a><a href="/calendar">Calendar</a><a className="navActive" href="/settings">Settings</a></nav></header>
    <section className="settingsHero"><div><div className="eyebrow">SYSTEM / PROVIDERS</div><h1>Choose your football data.</h1><p>Swap data sources without changing the Scoutboard UI or watchlist model.</p></div><div className="providerBadge"><span>PRIMARY</span><strong>{labels[provider].toUpperCase()}</strong></div></section>
    <section className="settingsGrid">
      <article className="featureCard settingsCard"><div className="eyebrow">ACTIVE PROVIDER</div><h2>Data source</h2><label className="fieldLabel">Primary provider<select value={provider} onChange={(event) => setProvider(event.target.value as Provider)}>{(Object.keys(labels) as Provider[]).map((name) => <option value={name} key={name}>{labels[name]}</option>)}</select></label>{(Object.keys(labels) as Provider[]).map((name) => <label className="fieldLabel" key={name}>{labels[name]} API key<input type="password" value={keys[name]} onChange={(event) => setKeys((current) => ({ ...current, [name]: event.target.value }))} placeholder={`Paste ${labels[name]} key`} autoComplete="off" /></label>)}<div className="settingsActions"><button className="primaryButton" onClick={save}>{saved ? '✓ Saved' : 'Save provider settings'}</button></div><div className="settingsNote"><span>◎</span><div><strong>Browser-local</strong><small>Keys and provider choice stay in this browser; nothing is written into the repository.</small></div></div></article>
      <article className="featureCard settingsCard"><div className="eyebrow">PROVIDER MATRIX</div><h2>What Scoutboard uses</h2><div className="providerRow"><span>Footballdata.io</span><strong>PLAYER + TEAM + FIXTURES</strong></div><p>Direct player search plus team identities and upcoming fixtures make it a strong fit for the core watchlist flow.</p><div className="providerRow"><span>OpenFootAPI</span><strong>ALTERNATE + MATCH INTEL</strong></div><p>Useful second source for fixtures, squads, lineups, xG and match context.</p><div className="providerRow"><span>API-Football</span><strong>LEGACY FALLBACK</strong></div><p>Kept available while we compare coverage and reliability.</p></article>
    </section>
  </main>;
}
