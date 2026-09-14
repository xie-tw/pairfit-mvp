import type { WeeklyReportResponse, WeeklyReportBullet } from '../../api/ai/weekly-report';
import type { WeightRecord } from '../store/weight';
import type { FoodRecord } from '../store/food';
import type { ExerciseRecord } from '../store/exercise';
import type { Goal } from '../store/goal';

/**
 * Client-side wrapper for the weekly-report endpoint.
 *
 * Mirrors the food-estimate wrapper: 10-second timeout, best-effort
 * fallback so the UI can always render *something*. When the request
 * fails we hand back a heuristic-shaped bullet list built from the same
 * numbers, so the card on Trends never sits empty just because the LLM
 * endpoint was unreachable.
 */

export interface WeeklyReportError {
  code: 'timeout' | 'network' | 'http' | 'parse';
  message: string;
}

export const WEEKLY_REPORT_TIMEOUT_MS = 9_500;

export type WeeklyReportOutcome =
  | { ok: true; data: WeeklyReportResponse }
  | { ok: false; error: WeeklyReportError; fallback: WeeklyReportResponse };

export interface WeeklyReportRequest {
  weights: WeightRecord[];
  foods: FoodRecord[];
  exercises: ExerciseRecord[];
  goal: Goal | null;
  /** Inclusive start of the reporting window (ms). */
  weekStart: number;
}

/**
 * Call the AI endpoint. Always resolves — on error we return a fallback
 * shaped exactly like the success payload so callers can render the
 * card without branching.
 */
export async function generateWeeklyReport(
  input: WeeklyReportRequest,
  signal?: AbortSignal,
): Promise<WeeklyReportOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEEKLY_REPORT_TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());

  try {
    const response = await fetch('/api/ai/weekly-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: { code: 'http', message: `HTTP ${response.status}` },
        fallback: heuristicFallback(input),
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        ok: false,
        error: { code: 'parse', message: 'Invalid JSON in response' },
        fallback: heuristicFallback(input),
      };
    }

    if (!isValidResponse(data)) {
      return {
        ok: false,
        error: { code: 'parse', message: 'Schema mismatch' },
        fallback: heuristicFallback(input),
      };
    }

    return { ok: true, data };
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    return {
      ok: false,
      error: {
        code: isAbort ? 'timeout' : 'network',
        message: isAbort ? 'Timed out' : String(err),
      },
      fallback: heuristicFallback(input),
    };
  } finally {
    clearTimeout(timer);
  }
}

function isValidResponse(value: unknown): value is WeeklyReportResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.summary !== 'string') return false;
  if (v.source !== 'openai' && v.source !== 'heuristic') return false;
  if (!Array.isArray(v.bullets) || v.bullets.length === 0) return false;
  return v.bullets.every((b) => {
    if (!b || typeof b !== 'object') return false;
    const r = b as Record<string, unknown>;
    return typeof r.emoji === 'string' && typeof r.text === 'string';
  });
}

/**
 * Local fallback — used when the network is down / the LLM is slow. Mirrors
 * the heuristic report the server returns without the key, but we keep
 * the client-side copy independent so the UI can still show *something*
 * in pure-localStorage preview environments.
 */
export function heuristicFallback(input: WeeklyReportRequest): WeeklyReportResponse {
  const weekEnd = input.weekStart + 7 * 24 * 60 * 60 * 1000;
  const inWindow = <T extends { recordedAt: number }>(records: T[]) =>
    records.filter((r) => r.recordedAt >= input.weekStart && r.recordedAt < weekEnd);

  const w = inWindow(input.weights);
  const f = inWindow(input.foods);
  const e = inWindow(input.exercises);

  const dayKeys = new Set<number>();
  const mark = (ts: number) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    dayKeys.add(d.getTime());
  };
  w.forEach((r) => mark(r.recordedAt));
  f.forEach((r) => mark(r.recordedAt));
  e.forEach((r) => mark(r.recordedAt));

  const days = dayKeys.size;
  const bullets: WeeklyReportBullet[] = [];

  if (days === 0) {
    return {
      source: 'heuristic',
      summary: '📊 本周健身周报',
      bullets: [
        { emoji: '🌱', text: '本周还没有记录,先把第一周坚持下来 💪' },
      ],
    };
  }

  bullets.push({
    emoji: days >= 5 ? '✅' : '👍',
    text: `这周坚持了 ${days} 天记录`,
  });

  if (f.length) {
    const protein = Math.round(
      f.reduce((s, r) => s + r.items.reduce((ss, i) => ss + (i.p ?? 0), 0), 0),
    );
    bullets.push({ emoji: '🍗', text: `本周蛋白质 ${protein}g` });
  }

  const minutes = e.reduce((s, r) => s + r.durationMin, 0);
  if (minutes > 0) {
    bullets.push({ emoji: '🏃', text: `运动总时长 ${minutes} 分钟` });
  }

  if (w.length >= 2) {
    const sorted = [...w].sort((a, b) => a.recordedAt - b.recordedAt);
    const delta = Math.round((sorted[sorted.length - 1]!.weight - sorted[0]!.weight) * 10) / 10;
    const dir = delta < 0 ? '降' : delta > 0 ? '升' : '持平';
    bullets.push({
      emoji: '📉',
      text: `体重 ${dir}了 ${Math.abs(delta).toFixed(1)}${input.goal?.unit ?? 'kg'}`,
    });
  }

  return {
    source: 'heuristic',
    summary: '📊 本周健身周报',
    bullets: bullets.slice(0, 5),
  };
}

/**
 * Compute the ISO-week-start timestamp for a given instant. We use
 * Monday as the start of the week (matches PairFit's "weekly report"
 * copy and most non-US calendars).
 *
 * Returns the *local* midnight for that Monday — timezone-correct via
 * `Date.setHours(0,0,0,0)`. Good enough for cache-keying purposes;
 * a millisecond-precise UTC anchor isn't required to bucket reports
 * correctly.
 */
export function startOfIsoWeek(at = Date.now()): number {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // Sunday = 0 → we shift back 6 to land on the previous Monday.
  const offset = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - offset);
  return d.getTime();
}
