import type { FoodItem } from '../store/food';

/**
 * Client-side wrapper for the food-estimating endpoint.
 *
 * Lives outside the store so callers can mock it in tests / Storybook
 * without going through Zustand. The 10-second timeout mirrors the
 * PRD's "AI 估算超时 (>10s) → 降级为模糊估算" rule — when the network
 * times out we still hand the caller a usable estimate so they don't
 * have to re-prompt the user.
 */

export interface FoodEstimateResponse {
  items: FoodItem[];
  totalCalories: number;
  confidence: number;
  /** `openai` when the serverless function called the LLM, `heuristic` otherwise. */
  source: 'openai' | 'heuristic';
}

export interface FoodEstimateError {
  code: 'timeout' | 'network' | 'http' | 'parse';
  message: string;
}

export const FOOD_ESTIMATE_TIMEOUT_MS = 9_500;

export type FoodEstimateOutcome =
  | { ok: true; data: FoodEstimateResponse }
  /** Best-effort fallback so the page can still render. */
  | { ok: false; error: FoodEstimateError; fallback: FoodEstimateResponse };

/**
 * Estimate a meal from free-form text. Always resolves — on error we
 * return a graceful fallback (a single 250-kcal "other" item with
 * confidence 0) so the caller can keep the UI alive.
 */
export async function estimateFood(text: string, signal?: AbortSignal): Promise<FoodEstimateOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FOOD_ESTIMATE_TIMEOUT_MS);
  // Forward the caller's signal (e.g. the user navigating away) into ours.
  signal?.addEventListener('abort', () => controller.abort());

  try {
    const response = await fetch('/api/ai/food-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: { code: 'http', message: `HTTP ${response.status}` },
        fallback: heuristicFallback(text),
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        ok: false,
        error: { code: 'parse', message: 'invalid JSON' },
        fallback: heuristicFallback(text),
      };
    }

    if (!isFoodEstimateResponse(data)) {
      return {
        ok: false,
        error: { code: 'parse', message: 'schema mismatch' },
        fallback: heuristicFallback(text),
      };
    }
    return { ok: true, data };
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    return {
      ok: false,
      error: {
        code: isAbort ? 'timeout' : 'network',
        message: isAbort ? 'timeout' : (err instanceof Error ? err.message : 'unknown'),
      },
      fallback: heuristicFallback(text),
    };
  } finally {
    clearTimeout(timer);
  }
}

function isFoodEstimateResponse(value: unknown): value is FoodEstimateResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.items)) return false;
  if (typeof v.totalCalories !== 'number') return false;
  if (typeof v.confidence !== 'number') return false;
  return v.source === 'openai' || v.source === 'heuristic';
}

/**
 * Client-side fallback used only when the network call itself failed —
 * normally the serverless endpoint already runs the heuristic, so this
 * is the last line of defence.
 */
function heuristicFallback(text: string): FoodEstimateResponse {
  const trimmed = text.trim();
  return {
    items: trimmed
      ? [
          {
            name: trimmed.slice(0, 32),
            calories: 250,
            p: 0,
            c: 0,
            f: 0,
          },
        ]
      : [],
    totalCalories: trimmed ? 250 : 0,
    confidence: trimmed ? 0.1 : 0,
    source: 'heuristic',
  };
}
