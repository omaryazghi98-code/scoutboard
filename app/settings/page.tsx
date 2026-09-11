'use client';

import { useEffect, useState } from 'react';

const KEY_STORAGE = 'scoutboard-api-football-key';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(window.localStorage.getItem(KEY_STORAGE) || '');
  }, []);

  const save = () => {
    if (apiKey.trim()) window.localStorage.setItem(KEY_STORAGE, apiKey.trim());
    else window.localStorage.removeItem(KEY_STORAGE);
    setApiKey(apiKey.trim());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const clear = () => {
    window.localStorage.removeItem(KEY_STORAGE);
    setApiKey('');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return <main className="workspace">
    <header className="topbar">
      <a className="brand" href="/">SCOUTBOARD <span>0.1</span></a>
      <nav><a href="/">Board</a><a href="/watchlist">Watchlist</a><a href="/calendar">Calendar</a><a className="navActive" href="/settings">Settings</a></nav>
    </header>

    <section className="settingsHero">
      <div>
        <div className="eyebrow">SYSTEM / PROVIDERS</div>
        <h1>Connect your football data.</h1>
        <p>Scoutboard can use your own API-Football key. The key is stored only in this browser and sent to your local Scoutboard server when you search.</p>
      </div>
      <div className="providerBadge"><span>API-FOOTBALL</span><strong>READY</strong></div>
    </section>

    <section className="settingsGrid">
      <article className="featureCard settingsCard">
        <div className="eyebrow">PRIMARY PROVIDER</div>
        <h2>API-Football</h2>
        <p>Paste the key from your API-Football dashboard. Leave it empty to fall back to the server-side <span className="mono">API_FOOTBALL_KEY</span> environment variable.</p>
        <label className="fieldLabel">API key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste API-Football key" autoComplete="off" /></label>
        <div className="settingsActions"><button className="primaryButton" onClick={save}>{saved ? '✓ Saved' : 'Save key'}</button><button className="ghostButton" onClick={clear}>Clear local key</button></div>
        <div className="settingsNote"><span>◎</span><div><strong>Local-first configuration</strong><small>Your browser keeps this setting in localStorage. It is not committed to GitHub.</small></div></div>
      </article>

      <article className="featureCard settingsCard">
        <div className="eyebrow">NEXT PROVIDERS</div>
        <h2>Provider slots</h2>
        <p>The data layer is intentionally modular so we can add Sportmonks later for richer broadcast coverage without redesigning the app.</p>
        <div className="providerRow"><span>API-Football</span><strong>LIVE</strong></div>
        <div className="providerRow mutedRow"><span>Sportmonks</span><strong>PLANNED</strong></div>
        <div className="providerRow mutedRow"><span>SofaScore</span><strong>REFERENCE ONLY</strong></div>
      </article>
    </section>
  </main>;
}
