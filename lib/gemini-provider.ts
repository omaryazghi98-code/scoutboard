const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/interactions';
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

const playerSchema = {
  type: 'object',
  properties: {
    players: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          providerId: { type: 'string' },
          name: { type: 'string' },
          team: { type: 'string' },
          teamId: { type: ['string', 'null'] },
          teamLogo: { type: ['string', 'null'] },
          position: { type: 'string' },
          nationality: { type: 'string' },
          photo: { type: ['string', 'null'] },
          sourceUrl: { type: ['string', 'null'] },
        },
        required: ['id', 'providerId', 'name', 'team', 'teamId', 'teamLogo', 'position', 'nationality', 'photo', 'sourceUrl'],
      },
    },
  },
  required: ['players'],
};

function extractText(payload: any) {
  const steps = Array.isArray(payload?.steps) ? payload.steps : [];
  const modelStep = [...steps].reverse().find((step: any) => step?.type === 'model_output');
  if (Array.isArray(modelStep?.content)) return modelStep.content.map((item: any) => item?.text || '').join('');

  const outputs = Array.isArray(payload?.outputs) ? payload.outputs : [];
  const textOutput = [...outputs].reverse().find((item: any) => item?.type === 'text');
  return textOutput?.text || payload?.output_text || '';
}

export async function searchPlayersGemini(
  query: string,
  apiKey: string,
  model = DEFAULT_MODEL,
  useWebGrounding = false,
): Promise<GeminiPlayer[]> {
  if (!apiKey) throw new Error('Gemini API key is not configured. Open Settings and add one.');

  const prompt = `Find the football player or players that best match this query. Query: ${query}. Return ONLY genuine football/soccer players and do not invent facts. Prefer the exact person when the query names a specific player. Return a JSON object with a players array containing at most 8 objects. Fields: id, providerId, name, team (current first-team club if known), teamId (null unless a stable football-data ID is explicitly verified), teamLogo, position, nationality, photo, sourceUrl.`;

  const body: Record<string, unknown> = {
    model,
    input: prompt,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: playerSchema,
    },
  };

  if (useWebGrounding) body.tools = [{ type: 'google_search', search_types: ['web_search'] }];

  const response = await fetch(GEMINI_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Gemini request failed (${response.status})`);

  const text = extractText(payload).trim();
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(cleaned || '{"players":[]}');
  const rows = Array.isArray(parsed) ? parsed : parsed?.players;

  return (Array.isArray(rows) ? rows : []).map((row: any) => ({
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
