'use client';

import { useEffect, useState } from 'react';

type FixtureProvider = 'footballdata' | 'openfoot' | 'api-football';

const FIXTURE_PROVIDER_KEY = 'scoutboard-fixture-provider';
const LEGACY_PROVIDER_KEY = 'scoutboard-provider';
const GEMINI_KEY = 'scoutboard-gemini-key';
const GEMINI_MODEL_KEY = 'scoutboard-gemini-model';
const GEMINI_GROUNDING_KEY = 'scoutboard-gemini-grounding';
const PROVIDER_KEYS: Record<FixtureProvider, string> = { footballdata: 'scoutboard-footballdata-key', openfoot: 'scoutboard-openfoot-key', 'api-football': 'scoutboard-api-football-key' };
const labels: Record<FixtureProvider, string> = { footballdata: 'Footballdata.io', openfoot: 'OpenFootAPI', 'api-football': 'API-Football' };
const models = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];

export default function SettingsPage() {
  const [fixtureProvider, setFixtureProvider] = useState<FixtureProvider>('footballdata');
  const [keys, setKeys] = useState<Record<FixtureProvider, string>>({ footballdata: '', openfoot: '', 'api-football': '' });
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');
  const [geminiGrounding, setGeminiGrounding] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FIXTURE_PROVIDER_KEY) || window.localStorage.getItem(LEGACY_PROVIDER_KEY);
      if (stored && Object.prototype.hasOwnProperty.call(PROVIDER_KEYS, stored)) setFixtureProvider(stored as FixtureProvider);
      (Object.keys(PROVIDER_KEYS) as FixtureProvider[]).forEach((name) => setKeys((current) => ({ ...current, [name]: window.localStorage.getItem(PROVIDER_KEYS[name]) || '' })));
      setGeminiKey(window.localStorage.getItem(GEMINI_KEY) || '');
      const storedModel = window.localStorage.getItem(GEMINI_MODEL_KEY);
      if (storedModel && models.includes(storedModel)) setGeminiModel(storedModel);
      setGeminiGrounding(window.localStorage.getItem(GEMINI_GROUNDING_KEY) === 'true');
    } catch {}
  }, []);

  const save = () => {
    window.localStorage.setItem(FIXTURE_PROVIDER_KEY, fixtureProvider);
    (Object.keys(PROVIDER_KEYS) as FixtureProvider[]).forEach((name) => {
      const value = keys[name].trim();
      if (value) window.localStorage.setItem(PROVIDER_KEYS[name], value); else window.localStorage.removeItem(PROVIDER_KEYS[name]);
    });
    const aiKey = geminiKey.trim();
    if (aiKey) window.localStorage.setItem(GEMINI_KEY, aiKey); else window.localStorage.removeItem(GEMINI_KEY);
    window.localStorage.setItem(GEMINI_MODEL_KEY, geminiModel);
    window.localStorage.setItem(GEMINI_GROUNDING_KEY, String(geminiGrounding));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return <main className="workspace">
    <header className="topbar"><a className="brand" href="/">SCOUTBOARD <span>0.1</span></a><nav><a href="/">Board</a><a href="/watchlist">Watchlist</a><a href="/calendar">Calendar</a><a className="navActive" href="/settings">Settings</a></nav></header>
    <section className="settingsHero"><div><div className="eyebrow">SYSTEM / PROVIDERS</div><h1>Configure your data stack.</h1><p>AI helps with discovery, but it never becomes the source of truth. Football data owns the canonical club identity used for fixtures.</p></div><div className="providerBadge"><span>FIXTURE PROVIDER</span><strong>{labels[fixtureProvider].toUpperCase()}</strong></div></section>
    <section className="settingsGrid">
      <article className="featureCard settingsCard">
        <div className="eyebrow">AI / PLAYER DISCOVERY</div><h2>Gemini</h2>
        <p>Used only as a fallback/disambiguator after direct football sources are checked. This keeps AI calls cheaper and prevents guessed clubs from driving your calendar.</p>
        <label className="fieldLabel">Gemini API key<input type="password" value={geminiKey} onChange={(event) => setGeminiKey(event.target.value)} placeholder="Paste Gemini API key" autoComplete="off" /></label>
        <label className="fieldLabel">Model<select value={geminiModel} onChange={(event) => setGeminiModel(event.target.value)}>{models.map((model) => <option value={model} key={model}>{model}</option>)}</select></label>
        <label className="toggleRow"><input type="checkbox" checked={geminiGrounding} onChange={(event) => setGeminiGrounding(event.target.checked)} /><span><strong>Google Search grounding</strong><small>Optional and off by default. It is not required for the verified resolver path.</small></span></label>
      </article>
      <article className="featureCard settingsCard">
        <div className="eyebrow">FIXTURE / CLUB IDENTITY</div><h2>Football provider</h2>
        <label className="fieldLabel">Fixture provider<select value={fixtureProvider} onChange={(event) => setFixtureProvider(event.target.value as FixtureProvider)}>{(Object.keys(labels) as FixtureProvider[]).map((name) => <option value={name} key={name}>{labels[name]}</option>)}</select></label>
        <div className="settingsActions"><button className="primaryButton" onClick={save}>{saved ? '✓ Saved' : 'Save settings'}</button></div>
        <div className="settingsNote"><span>◎</span><div><strong>Browser-local</strong><small>Keys, model choice and provider selection stay in this browser. No secret is committed to GitHub.</small></div></div>
      </article>
    </section>
    <section className="sectionBlock"><div className="sectionHeader"><div><div className="eyebrow">FOOTBALL DATA KEYS</div><h2>Available match providers</h2></div></div><div className="featureCard settingsCard">{(Object.keys(labels) as FixtureProvider[]).map((name) => <label className="fieldLabel" key={name}>{labels[name]} API key<input type="password" value={keys[name]} onChange={(event) => setKeys((current) => ({ ...current, [name]: event.target.value }))} placeholder={`Paste ${labels[name]} key`} autoComplete="off" /></label>)}<p className="settingsHint"><strong>Verified pipeline:</strong> football data + TheSportsDB → reconcile player identity → canonical current club → resolve that club against the fixture provider → fixtures → calendar. Gemini only helps when direct sources cannot identify the player.</p></div></section>
  </main>;
}
