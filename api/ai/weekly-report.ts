import type { FoodRecord } from '../../src/store/food';
import type { ExerciseRecord } from '../../src/store/exercise';
import type { WeightRecord } from '../../src/store/weight';
import type { Goal } from '../../src/store/goal';

/**
 * POST /api/ai/weekly-report
 *
 * Body: {
 *   weights: WeightRecord[], foods: FoodRecord[],
 *   exercises: ExerciseRecord[], goal: Goal | null,
 *   weekStart: number (ms)
 * }
 *
 * Returns: {
 *   bullets: Array<{ emoji: string, text: string }>,
 *   summary: string,
 *   source: 'openai' | 'heuristic'
 * }
 *
 * Mirrors the structure of `/api/ai/food-estimate`: if `OPENAI_API_KEY`
 * is set we ask the LLM for 3–5 bullets; otherwise we deterministically
 * compute a small set from the rolled-up stats so dev / preview still
 * gets a usable report.
 *
 * The prompt is intentionally narrow: no medical advice, second-person
 * "you", emoji-led, one line each. PRD §11.2 calls this out as a
 * "health" boundary and PF-8 §5 doubles down on it.
 */

interface RequestBody {
  weights?: unknown;
  foods?: unknown;
  exercises?: unknown;
  goal?: unknown;
  weekStart?: unknown;
}

export interface WeeklyReportBullet {
  emoji: string;
  text: string;
}

export interface WeeklyReportResponse {
  bullets: WeeklyReportBullet[];
  /** Short headline line (e.g. "本周健身周报"). */
  summary: string;
  source: 'openai' | 'heuristic';
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
}

const SYSTEM_PROMPT = `You are a friendly fitness-coach assistant. The user gives you their last 7 days of data (weights, foods, exercises, optional goal). Generate a concise weekly report in STRICT JSON (no markdown fences, no commentary).

Output shape (return ONLY this JSON):
{"summary":"📊 本周健身周报","bullets":[{"emoji":"✅","text":"短句,中文/英文都行,跟用户语言保持一致"},{"emoji":"🍗","text":"..."}],"source":"openai"}

Rules:
- summary: short headline, ≤ 30 chars, include 📊 emoji
- bullets: 3–5 items. emoji-led, one short sentence each, ≤ 30 chars
- tone: warm, encouraging, second-person ("你" / "you"), never shaming
- never give medical advice, never suggest specific diets or supplements
- if data is sparse (<2 entries), say so gently and motivate ("先把第一周坚持下来 💪")
- compute deltas yourself when useful ("比上周多 X% 蛋白" / "X% more protein than last week")
- numbers must match the input; do not invent weight changes`;

const OPENAI_TIMEOUT_MS = 9_000;

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
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

  const weights = asArray<WeightRecord>(body.weights);
  const foods = asArray<FoodRecord>(body.foods);
  const exercises = asArray<ExerciseRecord>(body.exercises);
  const goal = asGoal(body.goal);
  const weekStart = typeof body.weekStart === 'number' ? body.weekStart : Date.now() - 7 * 24 * 60 * 60 * 1000;

  const stats = computeWeekStats(weights, foods, exercises, goal, weekStart);

  // Vercel edge runtime exposes env via `process.env` even though
  // `tsconfig.app.json` doesn't include the node typings — narrow cast
  // keeps `tsc -b` happy while preserving the runtime behaviour.
  const apiKey = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env
    .OPENAI_API_KEY;
  if (apiKey) {
    try {
      const llm = await callOpenAI(stats, apiKey);
      if (llm) return jsonResponse(llm, 200, corsHeaders);
    } catch (err) {
      console.warn('[weekly-report] openai failed, falling back:', reasonFor(err));
    }
  }

  return jsonResponse(buildHeuristicReport(stats), 200, corsHeaders);
}

/* -------------------------------------------------------------------------- */

function jsonResponse(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asGoal(value: unknown): Goal | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.direction !== 'string') return null;
  return value as Goal;
}

function reasonFor(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

interface WeekStats {
  recordingDays: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalExerciseMinutes: number;
  totalExerciseCalories: number;
  weightStart: number | null;
  weightEnd: number | null;
  weightDelta: number | null;
  goal: Goal | null;
  hasData: boolean;
}

function computeWeekStats(
  weights: WeightRecord[],
  foods: FoodRecord[],
  exercises: ExerciseRecord[],
  goal: Goal | null,
  weekStart: number,
): WeekStats {
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
  const inWindow = <T extends { recordedAt: number }>(records: T[]) =>
    records.filter((r) => r.recordedAt >= weekStart && r.recordedAt < weekEnd);

  const wIn = inWindow(weights).sort((a, b) => a.recordedAt - b.recordedAt);
  const fIn = inWindow(foods);
  const eIn = inWindow(exercises);

  // Recording days = unique day buckets across all three streams.
  const dayKeys = new Set<number>();
  const mark = (ts: number) => dayKeys.add(startOfDay(ts));
  wIn.forEach((r) => mark(r.recordedAt));
  fIn.forEach((r) => mark(r.recordedAt));
  eIn.forEach((r) => mark(r.recordedAt));

  const totals = fIn.reduce(
    (acc, f) => {
      acc.cal += f.totalCalories;
      acc.p += f.items.reduce((s, i) => s + (i.p ?? 0), 0);
      acc.c += f.items.reduce((s, i) => s + (i.c ?? 0), 0);
      acc.f += f.items.reduce((s, i) => s + (i.f ?? 0), 0);
      return acc;
    },
    { cal: 0, p: 0, c: 0, f: 0 },
  );

  const exTotals = eIn.reduce(
    (acc, e) => {
      acc.min += e.durationMin;
      acc.cal += e.estimatedCalories;
      return acc;
    },
    { min: 0, cal: 0 },
  );

  return {
    recordingDays: dayKeys.size,
    totalCalories: Math.round(totals.cal),
    totalProtein: Math.round(totals.p),
    totalCarbs: Math.round(totals.c),
    totalFat: Math.round(totals.f),
    totalExerciseMinutes: Math.round(exTotals.min),
    totalExerciseCalories: Math.round(exTotals.cal),
    weightStart: wIn.length ? wIn[0]!.weight : null,
    weightEnd: wIn.length ? wIn[wIn.length - 1]!.weight : null,
    weightDelta:
      wIn.length >= 2 ? Math.round((wIn[wIn.length - 1]!.weight - wIn[0]!.weight) * 10) / 10 : null,
    goal,
    hasData: dayKeys.size > 0,
  };
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function callOpenAI(stats: WeekStats, apiKey: string): Promise<WeeklyReportResponse | null> {
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
        model: (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env
          .OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(stats) },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`openai_${response.status}`);
    const data = (await response.json()) as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = parseLLMJson(content);
    if (!parsed) return null;
    return { ...parsed, source: 'openai' };
  } finally {
    clearTimeout(timer);
  }
}

function parseLLMJson(raw: string): Omit<WeeklyReportResponse, 'source'> | null {
  const stripped = raw
    .replace(/^[\s\S]*?```(?:json)?\s*/i, '')
    .replace(/```[\s\S]*$/g, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
  const rawBullets = Array.isArray(obj.bullets) ? obj.bullets : [];
  const bullets: WeeklyReportBullet[] = [];
  for (const b of rawBullets) {
    if (!b || typeof b !== 'object') continue;
    const r = b as Record<string, unknown>;
    const emoji = typeof r.emoji === 'string' ? r.emoji.trim() : '💪';
    const text = typeof r.text === 'string' ? r.text.trim() : '';
    if (!text) continue;
    bullets.push({ emoji, text });
  }
  if (bullets.length === 0) return null;
  return { summary: summary || '📊 本周健身周报', bullets: bullets.slice(0, 5) };
}

/**
 * Deterministic report built from the rolled-up stats. Used when no
 * OPENAI_API_KEY is set (preview / dev). Tries to feel like the LLM
 * output (warm, encouraging, concrete numbers) but stays in plain TS so
 * tests / Storybook can lock it down.
 */
function buildHeuristicReport(stats: WeekStats): WeeklyReportResponse {
  if (!stats.hasData) {
    return {
      source: 'heuristic',
      summary: '📊 本周健身周报',
      bullets: [
        { emoji: '🌱', text: '本周还没有记录,先把第一周坚持下来 💪' },
        { emoji: '✏️', text: '明天先记一条体重,曲线就开始画了' },
      ],
    };
  }

  const bullets: WeeklyReportBullet[] = [];
  const days = stats.recordingDays;
  bullets.push({
    emoji: days >= 5 ? '✅' : days >= 3 ? '👍' : '🌱',
    text: `这周坚持了 ${days} 天记录,${days >= 5 ? '超出 80% 的用户' : '继续保持'}`,
  });

  if (stats.totalCalories > 0) {
    bullets.push({
      emoji: '🍗',
      text: `本周蛋白质 ${stats.totalProtein}g,平均每天 ${Math.round(stats.totalProtein / Math.max(days, 1))}g`,
    });
  }

  if (stats.totalExerciseMinutes > 0) {
    bullets.push({
      emoji: '🏃',
      text: `运动总时长 ${stats.totalExerciseMinutes} 分钟,消耗约 ${stats.totalExerciseCalories} kcal`,
    });
  } else {
    bullets.push({ emoji: '🏃', text: '本周还没运动,找个 10 分钟散步也好' });
  }

  if (stats.weightDelta !== null && stats.weightStart !== null && stats.weightEnd !== null) {
    const dir = stats.weightDelta < 0 ? '降' : stats.weightDelta > 0 ? '升' : '持平';
    bullets.push({
      emoji: '📉',
      text: `体重 ${dir}了 ${Math.abs(stats.weightDelta).toFixed(1)}${stats.goal?.unit ?? 'kg'}`,
    });
  }

  if (stats.goal && stats.weightDelta !== null) {
    const weeksToTarget = projectWeeksToTarget(stats.weightEnd ?? stats.weightStart ?? 0, stats.goal);
    if (Number.isFinite(weeksToTarget) && weeksToTarget > 0) {
      bullets.push({
        emoji: '🎯',
        text: `按这个节奏,预计 ${Math.ceil(weeksToTarget)} 周达到目标`,
      });
    }
  }

  // Always cap at 5 to mirror the LLM prompt contract.
  return {
    source: 'heuristic',
    summary: '📊 本周健身周报',
    bullets: bullets.slice(0, 5),
  };
}

function projectWeeksToTarget(currentWeight: number, goal: Goal): number {
  if (!goal.weeklyRate) return Number.POSITIVE_INFINITY;
  const remaining = goal.targetWeight - currentWeight;
  if (remaining === 0) return 0;
  return Math.abs(remaining / goal.weeklyRate);
}
