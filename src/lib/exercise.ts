/**
 * Exercise catalog + calorie estimation + voice parser.
 *
 * PF-5 covers three concerns that don't naturally live anywhere else:
 *
 *   1. The MET table — a constant lookup keyed by `ExerciseType`. MET
 *      (Metabolic Equivalent of Task) is the canonical way to estimate
 *      calories burned without a heart-rate monitor or accelerometer.
 *      The numbers below come from the 2011 Compendium of Physical
 *      Activities (Ainsworth et al.); they're "moderate effort" rows,
 *      which is why we also apply an intensity multiplier below.
 *
 *   2. The calorie estimator — `estimateCalories(...)`. Implements:
 *
 *          kcal = MET × weight(kg) × duration(h) × intensity_multiplier
 *
 *      This is the standard ACSM formula. Body weight lives in the user
 *      profile (PF-2), so we accept `weightKg` rather than re-deriving
 *      it from the store — keeps this module pure and easy to unit-test.
 *
 *   3. The voice parser — `parseExerciseFromTranscript(...)`. Tries to
 *      pull `{ type, durationMin }` out of a free-form sentence in
 *      Chinese OR English. Falls back to `null` when ambiguous so the
 *      caller (the page) can show the "didn't catch that" toast.
 *
 * What this module deliberately DOESN'T do:
 *   - No I/O, no storage — pure functions only.
 *   - No UI strings — the parser returns keys that the page maps to
 *     i18n labels, never raw user-facing copy.
 *   - No heart-rate, MET-min, or VO2-max math. The PRD explicitly defers
 *     those to V2; only the basic kcal estimate is in MVP scope.
 */

import type { ExerciseType, Intensity } from '../store/exercise';

/* -------------------------------------------------------------------------- */
/* MET table                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Moderate-effort MET values. Used directly by `estimateCalories`; the
 * intensity multiplier (see `INTENSITY_MULTIPLIER`) handles the rest.
 *
 * Adding a new exercise:
 *   1. Add the key to `ExerciseType` in `store/exercise.ts`.
 *   2. Add the matching entry here (numbers come from the 2024 update
 *      of the Compendium).
 *   3. Add the Chinese + English labels to `i18n/locales/*.json` under
 *      `record.exercise.types.<key>`.
 */
export const MET_BY_TYPE: Record<ExerciseType, number> = {
  running: 9.8,
  cycling: 7.5,
  swimming: 8.0,
  strength: 5.0,
  yoga: 2.5,
  elliptical: 5.0,
  rope: 12.3,
  pilates: 3.0,
  other: 4.0,
};

/** Display order — used by both the type picker and the history list. */
export const EXERCISE_TYPE_ORDER: ExerciseType[] = [
  'running',
  'cycling',
  'swimming',
  'strength',
  'yoga',
  'elliptical',
  'rope',
  'pilates',
  'other',
];

/**
 * Intensity multipliers. The MET table is calibrated at "moderate
 * effort", so the user-driven intensity selection is a relative scale
 * around that anchor. Low = a relaxed pace / beginner form; medium =
 * the table baseline; high = vigorous / competitive pace.
 */
export const INTENSITY_MULTIPLIER: Record<Intensity, number> = {
  low: 0.8,
  medium: 1.0,
  high: 1.2,
};

/* -------------------------------------------------------------------------- */
/* Calorie estimator                                                          */
/* -------------------------------------------------------------------------- */

export interface CalorieEstimateInput {
  type: ExerciseType;
  durationMin: number;
  intensity: Intensity;
  /** Body weight in kilograms — the metric the ACSM formula expects. */
  weightKg: number;
}

/**
 * Estimate calories burned.
 *
 *   kcal = MET × weight(kg) × duration(h) × intensityMultiplier
 *
 * Edge cases:
 *   - `durationMin <= 0` or `weightKg <= 0` → returns `0`. Callers
 *     already validate these; we double-check to avoid `NaN`.
 *   - The result is rounded DOWN to the nearest whole kcal for display.
 *     Storing a fractional value would just be noise.
 */
export function estimateCalories({
  type,
  durationMin,
  intensity,
  weightKg,
}: CalorieEstimateInput): number {
  if (!Number.isFinite(durationMin) || durationMin <= 0) return 0;
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 0;
  const met = MET_BY_TYPE[type] ?? MET_BY_TYPE.other;
  const multiplier = INTENSITY_MULTIPLIER[intensity] ?? 1;
  const hours = durationMin / 60;
  const kcal = met * weightKg * hours * multiplier;
  return Math.floor(kcal);
}

/* -------------------------------------------------------------------------- */
/* Voice transcript parser                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Result of attempting to extract exercise info from a transcript.
 *
 *   - `matched: true` → `type` and `durationMin` are both set; the
 *     caller can save without further input.
 *   - `matched: false` → we recovered *something* (e.g. a duration but
 *     no type, or vice versa) and the caller should pre-fill the form
 *     rather than auto-save. `partial` describes what we did recover.
 *   - Nothing found → `partial` is empty; the page shows the manual
 *     fallback.
 */
export interface ParsedExercise {
  type: ExerciseType | null;
  durationMin: number | null;
  matched: boolean;
  /**
   * Which fields we recovered. Useful for the page to decide whether
   * to auto-save (matched=true), pre-fill the form (one of these), or
   * fall back entirely (none of these).
   */
  partial: {
    type: boolean;
    duration: boolean;
  };
}

/**
 * Parse a voice transcript into an `ParsedExercise`. Supports Chinese
 * and English; case-insensitive; tolerant of filler words.
 *
 * Examples:
 *   "跑步 30 分钟"        → type=running,  durationMin=30
 *   "ran for 30 minutes" → type=running,  durationMin=30
 *   "骑了 1 小时"          → type=cycling,  durationMin=60
 *   "swam for an hour"   → type=swimming, durationMin=60
 *   "I did 45 minutes of strength" → type=strength, durationMin=45
 *
 * Unsupported types fall back to `other`. Unsupported durations return
 * `null` and the page surfaces the manual fallback.
 */
export function parseExerciseFromTranscript(text: string): ParsedExercise {
  const cleaned = text.trim();
  if (!cleaned) {
    return emptyParsed();
  }

  const lower = cleaned.toLowerCase();
  const type = matchExerciseType(lower, cleaned);
  const durationMin = matchDuration(lower, cleaned);

  const matched = type !== null && durationMin !== null;
  return {
    type,
    durationMin,
    matched,
    partial: {
      type: type !== null,
      duration: durationMin !== null,
    },
  };
}

function emptyParsed(): ParsedExercise {
  return {
    type: null,
    durationMin: null,
    matched: false,
    partial: { type: false, duration: false },
  };
}

/* -------------------------------------------------------------------------- */
/* Type keywords                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Keywords → ExerciseType. Each entry has both an English and a Chinese
 * alias (and a couple of common synonyms). Order matters within an entry:
 * longer phrases are matched first so "strength training" doesn't lose
 * to "strength" mid-string.
 *
 * Why hand-curated over a regex over the full string: users say weird
 * things ("went for a run", "今天做了瑜伽"). Hand-curated synonyms are
 * easier to extend than fragile alternation chains.
 */
const TYPE_KEYWORDS: Array<{ type: ExerciseType; phrases: string[] }> = [
  {
    type: 'running',
    phrases: ['went for a run', 'went running', 'ran for', 'ran', 'running', 'jogged', 'jogging', 'run', '跑步', '跑了步', '跑了', '跑'],
  },
  {
    type: 'cycling',
    phrases: ['rode a bike', 'biked', 'cycled', 'cycling', 'riding', 'bike', 'bicycle', 'ride', '骑行', '骑车了', '骑车', '骑了'],
  },
  {
    type: 'swimming',
    phrases: ['went swimming', 'swam', 'swimming', 'swim', '游泳', '游了', '游'],
  },
  {
    type: 'strength',
    phrases: ['strength training', 'weight training', 'weight lifting', 'lifted weights', 'lifting', '力量训练', '举铁', '撸铁', '力量'],
  },
  {
    type: 'yoga',
    phrases: ['yoga', '瑜伽', '练了瑜伽'],
  },
  {
    type: 'elliptical',
    phrases: ['elliptical', '椭圆机'],
  },
  {
    type: 'rope',
    phrases: ['rope skipping', 'skipped rope', 'jump rope', 'jumped rope', '跳绳'],
  },
  {
    type: 'pilates',
    phrases: ['pilates', '普拉提'],
  },
];

function matchExerciseType(lower: string, original: string): ExerciseType | null {
  // English scan — word-boundary regex so "ran" doesn't match "ranch".
  for (const { type, phrases } of TYPE_KEYWORDS) {
    for (const phrase of phrases) {
      if (!/^[a-z\s]+$/.test(phrase)) continue;
      // Escape regex metachars defensively (none of our phrases contain
      // any today, but future additions might).
      const pattern = new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'i');
      if (pattern.test(lower)) {
        return type;
      }
    }
  }
  // Chinese scan (case-sensitive because Chinese characters don't have case).
  for (const { type, phrases } of TYPE_KEYWORDS) {
    for (const phrase of phrases) {
      if (!/[一-鿿]/.test(phrase)) continue;
      if (original.includes(phrase)) {
        return type;
      }
    }
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* -------------------------------------------------------------------------- */
/* Duration keywords                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Try to pull a duration out of the transcript.
 *
 *   - Hours: "1 hour", "an hour", "1 小时", "一小时", "两小时" → 60 min × hours
 *   - Minutes: "30 minutes", "45 min", "30 分钟", "三十分钟", "半 h 小时" → min
 *   - Chinese numerals: same parser as the weight voice lib (kept inline
 *     here to avoid a circular import — `lib/voice.ts` doesn't know
 *     about exercise at all).
 *   - "half hour" / "半小时" → 30
 */
function matchDuration(lower: string, original: string): number | null {
  // --- English: "N hour(s)" ---
  const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  if (hourMatch) {
    return Math.round(Number.parseFloat(hourMatch[1]!) * 60);
  }
  // "an hour" / "a hour"
  if (/\b(?:an|a)\s+hours?\b/.test(lower)) {
    return 60;
  }
  // "half an hour" / "half hour"
  if (/\bhalf\s+(?:an\s+)?hours?\b/.test(lower) || /\bhalf\s+hr\b/.test(lower)) {
    return 30;
  }
  // --- English: "N minute(s)" / "N min" ---
  const minMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b/);
  if (minMatch) {
    return Math.round(Number.parseFloat(minMatch[1]!));
  }

  // --- Chinese: "N 小时" / "N 个 小时" ---
  // ASCII digits first because users sometimes mix ("跑了 30 分钟").
  const zhHourMatch = original.match(/(\d+(?:\.\d+)?)\s*(?:个)?\s*小时/);
  if (zhHourMatch) {
    return Math.round(Number.parseFloat(zhHourMatch[1]!) * 60);
  }
  // 一个小时 / 一个半小时
  if (/(?:一个|半个)\s*小时/.test(original)) {
    if (/半个/.test(original)) return 30;
    return 60;
  }
  // 半小时
  if (/半小时/.test(original)) {
    return 30;
  }
  // --- Chinese: "N 分钟" ---
  const zhMinMatch = original.match(/(\d+(?:\.\d+)?)\s*分(?:钟)?/);
  if (zhMinMatch) {
    return Math.round(Number.parseFloat(zhMinMatch[1]!));
  }
  // --- Chinese numerals: 半个小时 / 半小时 is already covered above; ---
  // --- half an hour variant: "半个小时" (covered) + "三十分钟" etc.  ---
  // Pick the last contiguous Chinese-numeral run that ends in 分钟 or 小时.
  const zhRun = matchChineseDuration(original);
  if (zhRun !== null) return zhRun;

  return null;
}

/**
 * Match a Chinese numeral duration. Supports canonical digits
 * (一二两三四五六七八九十百千万) — same digit/unit maps as `lib/voice.ts`.
 * Returns the parsed number in minutes, or `null`.
 */
function matchChineseDuration(text: string): number | null {
  const digitMap: Record<string, number> = {
    零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9,
  };
  const unitMap: Record<string, number> = {
    十: 10, 百: 100, 千: 1000, 万: 10000,
  };

  const idx = text.search(/分钟|小时/);
  if (idx < 0) return null;
  const isHour = text.startsWith('小时', Math.max(0, idx - 3)) || text[idx] === '小';
  // Walk backwards from the keyword to collect the longest run of digit/unit
  // characters. We keep expanding as long as the next character is a valid
  // digit or unit (and within a reasonable lookback window).
  let start = idx;
  for (let i = idx - 1; i >= 0 && i >= idx - 12; i -= 1) {
    const ch = text[i];
    if (ch === undefined) break;
    if (ch in digitMap || ch in unitMap) {
      start = i;
      continue;
    }
    // Allow "半个" / "一个" markers — '个' is a noun marker.
    if (ch === '个' || ch === '半') {
      start = i;
      continue;
    }
    break;
  }
  const run = text.slice(start, idx);
  // Strip filler characters that we allowed in the loop.
  const cleaned = run.replace(/[个半]/g, '');
  // Drop an optional leading "半" out of the chunk we hand to the parser —
  // we already handled "半小时" / "半个小时" above; if we got here, the
  // "半" was part of the numeral (rare but legal).
  if (cleaned === '' || cleaned === '半') {
    return isHour ? 30 : null;
  }
  const value = parseChineseInteger(cleaned, digitMap, unitMap);
  if (value === null) return null;
  return isHour ? Math.round(value * 60) : Math.round(value);
}

/**
 * Parse a Chinese integer string. Same algorithm as `lib/voice.ts`'s
 * `parseChineseInteger` — duplicated locally to keep this file free of
 * cross-module coupling. Treats "万" as the high-water mark; "百" / "千"
 * are sub-units within a 万-group.
 */
function parseChineseInteger(
  text: string,
  digitMap: Record<string, number>,
  unitMap: Record<string, number>,
): number | null {
  const wanIndex = text.indexOf('万');
  if (wanIndex >= 0) {
    const left = text.slice(0, wanIndex);
    const right = text.slice(wanIndex + 1);
    const leftVal = left === '' ? 1 : parseChunk(left, digitMap, unitMap, 10000);
    const rightVal = right === '' ? 0 : parseChunk(right, digitMap, unitMap, 10000);
    if (leftVal === null || rightVal === null) return null;
    return leftVal * 10000 + rightVal;
  }
  return parseChunk(text, digitMap, unitMap, 10000);
}

function parseChunk(
  text: string,
  digitMap: Record<string, number>,
  unitMap: Record<string, number>,
  ceiling: number,
): number | null {
  let total = 0;
  let section = 0;
  let prevDigit: number | null = null;
  for (const ch of text) {
    if (ch in digitMap) {
      prevDigit = digitMap[ch]!;
    } else if (ch in unitMap) {
      const unit = unitMap[ch]!;
      if (unit >= ceiling) return null;
      if (prevDigit === null) {
        section += 1 * unit;
      } else {
        section += prevDigit * unit;
        prevDigit = null;
      }
    } else if (ch === '零') {
      prevDigit = null;
    } else {
      return null;
    }
  }
  if (prevDigit !== null) section += prevDigit;
  total += section;
  return total;
}