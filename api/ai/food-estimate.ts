import { estimateMealFromText } from '../../src/lib/food-estimate';
import type { FoodItem } from '../../src/store/food';

/**
 * POST /api/ai/food-estimate
 *
 * Body: `{ text: string }`
 * Returns: `{ items: FoodItem[], totalCalories: number, confidence: number, source: 'openai' | 'heuristic' }`
 *
 * Web Fetch API signature (Request → Response). Vercel's Node 18+ runtime
 * passes the standard `Request` shape to default-exported handlers, and
 * the Vite dev middleware in `vite.config.ts` does the same. Edge runtime
 * is also supported.
 *
 * Behaviour:
 *   - If `OPENAI_API_KEY` is set: call OpenAI's Chat Completions endpoint
 *     with GPT-4o-mini. The model is asked to emit strict JSON; we parse
 *     defensively because LLMs love to wrap output in markdown fences.
 *   - Otherwise: fall back to the deterministic `estimateMealFromText`
 *     heuristic so dev / preview environments without a key still produce
 *     a usable demo.
 *
 * CORS is wide-open on purpose — this is a single-page app hitting its
 * own domain. Tighten if we ever expose the endpoint publicly.
 */

interface RequestBody {
  text?: unknown;
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
}

const SYSTEM_PROMPT = `You are a food-nutrition estimator. The user dictates what they ate in any language. Respond with STRICT JSON (no markdown fences, no commentary) of this exact shape:
{"items":[{"name":"string","calories":number,"p":number,"c":number,"f":number}],"totalCalories":number,"confidence":number}
Rules:
- "calories" is an estimate (±25% acceptable), integer.
- "p", "c", "f" are grams of protein, carbs, fat; integer.
- "items" is a flat array of distinct foods/drinks mentioned.
- "totalCalories" equals the sum of items' calories (recompute; do not trust your sum).
- "confidence" is 0..1. Lower it when the description is vague or partial. Use 0 if you cannot identify anything.
- If you cannot parse the input, return {"items":[],"totalCalories":0,"confidence":0}.`;

const OPENAI_TIMEOUT_MS = 9_000;

/**
 * Vercel needs `runtime` exported as a const so it knows which runtime
 * to provision. Edge runtime supports Web Fetch handlers natively and
 * accepts `process.env` (polyfilled).
 */
export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  // CORS — preflight and the actual call.
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, corsHeaders);
  }

  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400, corsHeaders);
  }
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return jsonResponse({ error: 'missing_text' }, 400, corsHeaders);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const llmResult = await callOpenAI(text, apiKey);
      if (llmResult) {
        return jsonResponse({ ...llmResult, source: 'openai' }, 200, corsHeaders);
      }
    } catch (err) {
      // Fall through to heuristic — never fail the request hard, just
      // degrade gracefully (the PRD's "timeout → fuzzy estimate" rule).
      console.warn('[food-estimate] openai failed, falling back:', reasonFor(err));
    }
  }

  const heuristic = estimateMealFromText(text);
  return jsonResponse({ ...heuristic, source: 'heuristic' }, 200, corsHeaders);
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/* -------------------------------------------------------------------------- */

async function callOpenAI(
  text: string,
  apiKey: string,
): Promise<{ items: FoodItem[]; totalCalories: number; confidence: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`openai_${response.status}`);
    }
    const data = (await response.json()) as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return parseLLMJson(content);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Defensive JSON parser for LLM output. Strips ``` fences, then walks the
 * first `{` through the matching `}` so prose like "Sure, here you go: …"
 * is ignored. Returns `null` if the result doesn't match the schema.
 */
function parseLLMJson(
  raw: string,
): { items: FoodItem[]; totalCalories: number; confidence: number } | null {
  const stripped = raw
    .replace(/^[\s\S]*?```(?:json)?\s*/i, '')
    .replace(/```[\s\S]*$/g, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const candidate = stripped.slice(start, end + 1);
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  const items: FoodItem[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    const calories = toFiniteNumber(r.calories);
    const p = toFiniteNumber(r.p);
    const c = toFiniteNumber(r.c);
    const f = toFiniteNumber(r.f);
    if (!name || calories === null) continue;
    items.push({
      name,
      calories: clampNonNegative(calories),
      p: clampNonNegative(p ?? 0),
      c: clampNonNegative(c ?? 0),
      f: clampNonNegative(f ?? 0),
    });
  }
  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
  const confidence = clamp01(toFiniteNumber(obj.confidence) ?? 0);
  return { items, totalCalories, confidence };
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function clampNonNegative(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  return Math.round(n);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function reasonFor(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'AbortError') return 'timeout';
    return err.message;
  }
  return 'unknown';
}
