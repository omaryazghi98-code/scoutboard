'use client';

import { useEffect, useState } from 'react';

const PROVIDER_KEY = 'scoutboard-provider';
const GEMINI_KEY = 'scoutboard-gemini-key';
const GEMINI_MODEL_KEY = 'scoutboard-gemini-model';
const GEMINI_GROUNDING_KEY = 'scoutboard-gemini-grounding';
const PROVIDER_KEYS = { gemini: 'scoutboard-gemini-key', footballdata: 'scoutboard-footballdata-key', openfoot: 'scoutboard-openfoot-key', 'api-football': 'scoutboard-api-football-key' } as const;
type Provider = keyof typeof PROVIDER_KEYS;

const models = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];

export default function SettingsPage() {
  const [provider, setProvider] = useState<Provider>('gemini');
  const [keys, setKeys] = useState<Record<Provider, string>>({ gemini: '', footballdata: '', openfoot: '', 'api-football': '' });
  const [geminiModel, setGeminiModel] = useState('gemini-3.7-flash');
  const [geminiGrounding, setGeminiGrounding] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PROVIDER_KEY) as Provider | null;
      if (stored && PROVIDER_KEYS[stored]) setProvider(stored);
      (Object.keys(PROVIDER_KEYS) as Provider[]).forEach((name) => {
        setKeys((current) => ({ ...current, [name]: window.localStorage.getItem(PROVIDER_KEYS[name]) || '' }));
      });
      setGeminiModel(window.localStorage.getItem(GEMINI_MODEL_KEY) || 'gemini-3.7-flash');
      setGeminiGrounding(window.localStorage.getItem(GEMINI_GROUNDING_KEY) === 'true');
    } catch {}
  }, []);

  const save = () => {
    window.localStorage.setItem(PROVIDER_KEY, provider);
    (Object.keys(PROVIDER_KEYS) as Provider[]).forEach((name) => {
      const value = keys[name].trim();
      if (value) window.localStorage.setItem(PROVIDER_KEYS[name], value); else window.localStorage.removeItem(PROVIDER_KEYS[name]);
    });
    window.localStorage.setItem(GEMINI_MODEL_KEY, geminiModel);
    window.localStorage.setItem(GEMINI_GROUNDING_KEY, String(geminiGrounding));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const labels: Record<Provider, string> = { gemini: 'Gemini', footballdata: 'Footballdata.io', openfoot: 'OpenFootAPI', 'api-football': 'API-Football' };
  return <main className="workspace">
    <header className="topbar"><a className="brand" href="/">SCOUTBOARD <span>0.1</span></a><nav><a href="/">Board</a><a href="/watchlist">Watchlist</a><a href="/calendar">Calendar</a><a className="navActive" href="/settings">Settings</a></nav></header>
    <section className="settingsHero"><div><div className="eyebrow">SYSTEM / PROVIDERS</div><h1>Configure your data stack.</h1><p>Keep AI discovery and football match data modular. Swap models or providers without rebuilding the Scoutboard UI.</p></div><div className="providerBadge"><span>ACTIVE DISCOVERY</span><strong>{labels[provider].toUpperCase()}</strong></div></section>
    <section className="settingsGrid">
      <article className="featureCard settingsCard">
        <div className="eyebrow">AI / PLAYER DISCOVERY</div><h2>Gemini</h2>
        <p>Gemini handles player discovery. Web grounding is optional because Google Search grounding is not available to every free API tier.</p>
        <label className="fieldLabel">Gemini API key<input type="password" value={keys.gemini} onChange={(event) => setKeys((current) => ({ ...current, gemini: event.target.value }))} placeholder="Paste Gemini API key" autoComplete="off" /></label>
        <label className="fieldLabel">Model<select value={geminiModel} onChange={(event) => setGeminiModel(event.target.value)}>{models.map((model) => <option value={model} key={model}>{model}</option>)}</select></label>
        <label className="toggleRow"><input type="checkbox" checked={geminiGrounding} onChange={(event) => setGeminiGrounding(event.target.checked)} /><span><strong>Google Search grounding</strong><small>Off by default for free-tier compatibility. Enable on a project/tier that supports it.</small></span></label>
      </article>
      <article className="featureCard settingsCard">
        <div className="eyebrow">ACTIVE DISCOVERY PROVIDER</div><h2>Provider</h2>
        <label className="fieldLabel">Player discovery<select value={provider} onChange={(event) => setProvider(event.target.value as Provider)}>{(Object.keys(labels) as Provider[]).map((name) => <option value={name} key={name}>{labels[name]}</option>)}</select></label>
        <div className="settingsActions"><button className="primaryButton" onClick={save}>{saved ? '✓ Saved' : 'Save settings'}</button></div>
        <div className="settingsNote"><span>◎</span><div><strong>Browser-local</strong><small>Keys, model choice and grounding preference stay in this browser; no API secret is written to the repository.</small></div></div>
      </article>
    </section>
    <section className="sectionBlock"><div className="sectionHeader"><div><div className="eyebrow">FOOTBALL DATA / FIXTURES</div><h2>Match providers</h2></div></div><div className="featureCard settingsCard">{(['footballdata', 'openfoot', 'api-football'] as Provider[]).map((name) => <label className="fieldLabel" key={name}>{labels[name]} API key<input type="password" value={keys[name]} onChange={(event) => setKeys((current) => ({ ...current, [name]: event.target.value }))} placeholder={`Paste ${labels[name]} key`} autoComplete="off" /></label>)}<p className="settingsHint">These providers remain independent from Gemini. Gemini finds the player; the selected football provider supplies team fixtures.</p></div></section>
  </main>;
}
