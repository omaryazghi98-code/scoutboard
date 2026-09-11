'use client';

import { useEffect, useState } from 'react';

const PROVIDER_KEY = 'scoutboard-provider';
const PROVIDER_KEYS = {
  footballdata: 'scoutboard-footballdata-key',
  openfoot: 'scoutboard-openfoot-key',
  'api-football': 'scoutboard-api-football-key',
} as const;

type Provider = keyof typeof PROVIDER_KEYS;

export default function SettingsPage() {
  const [provider, setProvider] = useState<Provider>('footballdata');
  const [keys, setKeys] = useState<Record<Provider, string>>({ footballdata: '', openfoot: '', 'api-football': '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const storedProvider = window.localStorage.getItem(PROVIDER_KEY) as Provider | null;
      if (storedProvider && PROVIDER_KEYS[storedProvider]) setProvider(storedProvider);
      setKeys({
        footballdata: window.localStorage.getItem(PROVIDER_KEYS.footballdata) || '',
        openfoot: window.localStorage.getItem(PROVIDER_KEYS.openfoot) || '',
        'api-football': window.localStorage.getItem(PROVIDER_KEYS['api-football']) || '',
      });
    } catch {}
  }, []);

  const save = () => {
    window.localStorage.setItem(PROVIDER_KEY, provider);
    (Object.keys(PROVIDER_KEYS) as Provider[]).forEach((name) => {
      const value = keys[name].trim();
      if (value) window.localStorage.setItem(PROVIDER_KEYS[name], value);
      else window.localStorage.removeItem(PROVIDER_KEYS[name]);
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return <main className="workspace">
    <header className="topbar">
      <a className="brand" href="/">SCOUTBOARD <span>0.1</span></a>
      <nav><a href="/">Board</a><a href="/watchlist">Watchlist</a><a href="/calendar">Calendar</a><a className="navActive" href="/settings">Settings</a></nav>
    </header>

    <section className="settingsHero">
      <div><div className="eyebrow">SYSTEM / PROVIDERS</div><h1>Choose your football data.</h1><p>Scoutboard keeps the provider layer modular. Pick the source you want to use for discovery and fixtures, then swap it without changing the app.</p></div>
      <div className="providerBadge"><span>PRIMARY</span><strong>{provider === 'footballdata' ? 'FOOTBALLDATA.IO' : provider === 'openfoot' ? 'OPENFOOTAPI' : 'API-FOOTBALL'}</strong></div>
    </section>

    <section className="settingsGrid">
      <article className="featureCard settingsCard">
        <div className="eyebrow">ACTIVE PROVIDER</div>
        <h2>Data source</h2>
        <label className="fieldLabel">Primary provider<select value={provider} onChange={(event) => setProvider(event.target.value as Provider)}><option value="footballdata">Footballdata.io</option><option value="openfoot">OpenFootAPI</option><option value="api-football">API-Football</option></select></label>
        {(Object.keys(PROVIDER_KEYS) as Provider[]).map((name) => <label className="fieldLabel" key={name}>{name === 'footballdata' ? 'Footballdata.io API key' : name === 'openfoot' ? 'OpenFootAPI key' : 'API-Football key'}<input type="password" value={keys[name]} onChange={(event) => setKeys((current) => ({ ...current, [name]: event.target.value }))} placeholder={`Paste ${name === 'api-football' ? 'API-Football' : name === 'openfoot' ? 'OpenFootAPI' : 'Footballdata.io'} key`} autoComplete="off" /></label>)}
        <div className="settingsActions"><button className="primaryButton" onClick={save}>{saved ? '✓ Saved' : 'Save provider settings'}</button></div>
        <div className="settingsNote"><span>◎</span><div><strong>Local configuration</strong><small>Provider choice and keys stay in this browser and are never committed to GitHub.</small></div></div>
      </article>

      <article className="featureCard settingsCard">
        <div className="eyebrow">WHY THESE THREE</div>
        <h2>Provider roles</h2>
        <div className="providerRow"><span>Footballdata.io</span><strong>PRIMARY</strong></div><p>Excellent fit for our core flow: player search, team identity, and upcoming fixtures through the same API. citeturn375197search0turn375197search2</p>
        <div className="providerRow"><span>OpenFootAPI</span><strong>SECONDARY</strong></div><p>Useful alternate source with team squads, team-filtered matches, lineups and xG-oriented match data. citeturn375197search4</p>
        <div className="providerRow"><span>API-Football</span><strong>LEGACY</strong></div><p>Still supported for comparison and fallback while we stabilize the multi-provider layer.</p>
      </article>
    </section>
  </main>;
}
