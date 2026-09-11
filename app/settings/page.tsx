'use client';

import { useEffect, useState } from 'react';

const PROVIDER_KEY = 'scoutboard-provider';
const GEMINI_KEY = 'scoutboard-gemini-key';
const GEMINI_MODEL_KEY = 'scoutboard-gemini-model';
const PROVIDER_KEYS = { footballdata: 'scoutboard-footballdata-key', openfoot: 'scoutboard-openfoot-key', 'api-football': 'scoutboard-api-football-key' } as const;
type Provider = keyof typeof PROVIDER_KEYS;

const models = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];

export default function SettingsPage() {
  const [provider, setProvider] = useState<Provider>('footballdata');
  const [keys, setKeys] = useState<Record<Provider, string>>({ footballdata: '', openfoot: '', 'api-football': '' });
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PROVIDER_KEY) as Provider | null;
      if (stored && PROVIDER_KEYS[stored]) setProvider(stored);
      setKeys({ footballdata: window.localStorage.getItem(PROVIDER_KEYS.footballdata) || '', openfoot: window.localStorage.getItem(PROVIDER_KEYS.openfoot) || '', 'api-football': window.localStorage.getItem(PROVIDER_KEYS['api-football']) || '' });
      setGeminiKey(window.localStorage.getItem(GEMINI_KEY) || '');
      setGeminiModel(window.localStorage.getItem(GEMINI_MODEL_KEY) || 'gemini-3.8-flash');
    } catch {}
  }, []);

  const save = () => {
    window.localStorage.setItem(PROVIDER_KEY, provider);
    (Object.keys(PROVIDER_KEYS) as Provider[]).forEach((name) => {
      const value = keys[name].trim();
      if (value) window.localStorage.setItem(PROVIDER_KEYS[name], value); else window.localStorage.removeItem(PROVIDER_KEYS[name]);
    });
    const aiKey = geminiKey.trim();
    if (aiKey) window.localStorage.setItem(GEMINI_KEY, aiKey); else window.localStorage.removeItem(GEMINI_KEY);
    window.localStorage.setItem(GEMINI_MODEL_KEY, geminiModel);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const labels: Record<Provider, string> = { footballdata: 'Footballdata.io', openfoot: 'OpenFootAPI', 'api-football': 'API-Football' };
  return <main className="workspace">
    <header className="topbar"><a className="brand" href="/">SCOUTBOARD <span>0.1</span></a><nav><a href="/">Board</a><a href="/watchlist">Watchlist</a><a href="/calendar">Calendar</a><a className="navActive" href="/settings">Settings</a></nav></header>
    <section className="settingsHero"><div><div className="eyebrow">SYSTEM / PROVIDERS</div><h1>Configure your data stack.</h1><p>Keep player discovery, football data, and AI modular so you can swap providers without rebuilding the Scoutboard UI.</p></div><div className="providerBadge"><span>FOOTBALL DATA</span><strong>{labels[provider].toUpperCase()}</strong></div></section>
    <section className="settingsGrid">
      <article className="featureCard settingsCard">
        <div className="eyebrow">AI / PLAYER DISCOVERY</div><h2>Gemini</h2>
        <p>Gemini handles live player discovery with Google Search grounding. Your API key stays in this browser and is only sent to Scoutboard's server route when you search.</p>
        <label className="fieldLabel">Gemini API key<input type="password" value={geminiKey} onChange={(event) => setGeminiKey(event.target.value)} placeholder="Paste Gemini API key" autoComplete="off" /></label>
        <label className="fieldLabel">Model<select value={geminiModel} onChange={(event) => setGeminiModel(event.target.value)}>{models.map((model) => <option value={model} key={model}>{model}</option>)}</select></label>
        <div className="settingsNote"><span>✦</span><div><strong>Live web-grounded discovery</strong><small>Searches can use current web information instead of relying only on model memory.</small></div></div>
      </article>
      <article className="featureCard settingsCard">
        <div className="eyebrow">ACTIVE FOOTBALL PROVIDER</div><h2>Match data</h2>
        <label className="fieldLabel">Primary provider<select value={provider} onChange={(event) => setProvider(event.target.value as Provider)}>{(Object.keys(labels) as Provider[]).map((name) => <option value={name} key={name}>{labels[name]}</option>)}</select></label>
        {(Object.keys(labels) as Provider[]).map((name) => <label className="fieldLabel" key={name}>{labels[name]} API key<input type="password" value={keys[name]} onChange={(event) => setKeys((current) => ({ ...current, [name]: event.target.value }))} placeholder={`Paste ${labels[name]} key`} autoComplete="off" /></label>)}
        <div className="settingsActions"><button className="primaryButton" onClick={save}>{saved ? '✓ Saved' : 'Save provider settings'}</button></div>
        <div className="settingsNote"><span>◎</span><div><strong>Browser-local</strong><small>Keys and provider choices stay in this browser; nothing is written into the repository.</small></div></div>
      </article>
    </section>
    <section className="sectionBlock"><div className="sectionHeader"><div><div className="eyebrow">STACK</div><h2>Scoutboard provider matrix</h2></div></div><div className="splitGrid"><article className="featureCard"><div className="providerRow"><span>Gemini</span><strong>PLAYER DISCOVERY + AI</strong></div><p>Current-web player search and, later, scouting summaries and research workflows.</p><div className="providerRow"><span>{labels[provider]}</span><strong>FIXTURES / MATCH DATA</strong></div><p>Your selected football provider remains separate from AI discovery.</p></article><article className="featureCard"><div className="providerRow"><span>Security</span><strong>NO REPO SECRETS</strong></div><p>Keys are entered at runtime and saved only to local browser storage. Never commit API keys to GitHub.</p></article></div></section>
  </main>;
}
