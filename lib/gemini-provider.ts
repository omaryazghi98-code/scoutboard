const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-3.8-flash';

export type GeminiPlayer = {
  id: string;
  providerId: string;
  name: string;
  team: string;
  teamId: string | null;
  teamLogo: string | null;
  position: string;
  nationality: string;
  photo: string | null;
  provider: 'gemini';
  sourceUrl?: string | null;
};

export async function searchPlayersGemini(query: string, apiKey: string, model = DEFAULT_MODEL): Promise<GeminiPlayer[]> {
  if (!apiKey) throw new Error('Gemini API key is not configured. Open Settings and add one.');

  const prompt = `Find the football player or players that best match this query using current web information. Query: ${query}. Return ONLY a JSON array with at most 8 objects. Fields: id, providerId, name, team (current first-team club in 2026), teamId (null unless verified), teamLogo, position, nationality, photo, sourceUrl. Do not invent facts or return unrelated people.`;

  const response = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Gemini request failed (${response.status})`);

  const text = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('') || '';
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  const parsed = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);

  return (Array.isArray(parsed) ? parsed : []).map((row: any) => ({
    id: String(row?.id ?? row?.providerId ?? row?.name ?? ''),
    providerId: String(row?.providerId ?? row?.id ?? row?.name ?? ''),
    name: String(row?.name ?? ''),
    team: String(row?.team ?? 'Unknown club'),
    teamId: row?.teamId == null ? null : String(row.teamId),
    teamLogo: row?.teamLogo || null,
    position: String(row?.position ?? 'Unknown'),
    nationality: String(row?.nationality ?? 'Unknown'),
    photo: row?.photo || null,
    provider: 'gemini' as const,
    sourceUrl: row?.sourceUrl || null,
  })).filter((player: GeminiPlayer) => player.name);
}
