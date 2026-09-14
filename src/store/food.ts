import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Food (meal) log entries — PF-4.
 *
 * Mirrors the PRD §16.3 spec: a meal can be one or more items; the
 * AI-estimated breakdown is captured alongside the original transcript so
 * a manual correction can preserve provenance (we know whether the user
 * tweaked `calories` because the LLM was off, or because they wanted to).
 *
 * `mealSlot` is derived from `recordedAt` at save time so the "breakfast /
 * lunch / dinner / snack" grouping on Home and Trends never goes stale as
 * time-of-day semantics shift (e.g. a user logging a midnight snack still
 * reads as a "snack" the next morning).
 */
export interface FoodItem {
  name: string;
  /** Optional emoji hint the AI attached (chicken 🍗, milk tea 🧋, …). */
  emoji?: string;
  calories: number;
  p: number;
  c: number;
  f: number;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodRecord {
  id: string;
  userId: string;
  rawText: string;
  items: FoodItem[];
  totalCalories: number;
  /** 0..1 — confidence returned by the LLM. Used to flag low-quality estimates. */
  aiConfidence: number;
  mealSlot: MealSlot;
  recordedAt: number;
  source: 'manual' | 'voice';
}

export const FOOD_KEY = 'pairfit:food';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface FoodState {
  records: FoodRecord[];
  addRecord: (input: Omit<FoodRecord, 'id' | 'recordedAt' | 'mealSlot'> & { mealSlot?: MealSlot }) => FoodRecord;
  setRecords: (records: FoodRecord[]) => void;
  clearRecords: () => void;
}

/**
 * Bucket a timestamp into breakfast / lunch / dinner / snack. Aligns with
 * the "时间" heuristic the PM mentioned in PRD §6.2 — Chinese / English
 * users tend to use roughly the same windows, so we keep the boundaries
 * language-agnostic.
 *
 *   05:00–10:59 → breakfast
 *   11:00–14:59 → lunch
 *   17:00–21:59 → dinner
 *   everything else → snack
 */
export function classifyMealSlot(at: number): MealSlot {
  const hour = new Date(at).getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

/**
 * Food log. Persisted under `pairfit:food`. Same pattern as the weight store
 * (records are kept in insertion order; sorting happens at read time).
 */
export const useFoodStore = create<FoodState>()(
  persist(
    (set) => ({
      records: [],

      addRecord: (input) => {
        const recordedAt = Date.now();
        const record: FoodRecord = {
          ...input,
          mealSlot: input.mealSlot ?? classifyMealSlot(recordedAt),
          id: cryptoId(),
          recordedAt,
        };
        set((state) => ({ records: [...state.records, record] }));
        return record;
      },

      setRecords: (records) => set({ records }),
      clearRecords: () => set({ records: [] }),
    }),
    {
      name: FOOD_KEY,
      partialize: (state) => ({ records: state.records }),
    },
  ),
);

/* -------------------------------------------------------------------------- */
/* Read helpers — kept here so pages don't each reimplement the same filters.  */
/* -------------------------------------------------------------------------- */

/** Sort newest → oldest. Mutates a copy. */
export function sortByDateDesc(records: FoodRecord[]): FoodRecord[] {
  return [...records].sort((a, b) => b.recordedAt - a.recordedAt);
}

/** Filter to a single calendar day's records (local time). */
export function withinDay(records: FoodRecord[], at = Date.now()): FoodRecord[] {
  const startOfDay = startOfLocalDay(at);
  const endOfDay = startOfDay + MS_PER_DAY;
  return records.filter((r) => r.recordedAt >= startOfDay && r.recordedAt < endOfDay);
}

/** Sum calories over a slice of records. */
export function sumCalories(records: FoodRecord[]): number {
  return records.reduce((sum, r) => sum + r.totalCalories, 0);
}

/** Aggregate macros over a slice of records. */
export function sumMacros(records: FoodRecord[]): { p: number; c: number; f: number } {
  return records.reduce(
    (acc, r) => {
      const totals = r.items.reduce(
        (s, item) => ({
          p: s.p + (item.p ?? 0),
          c: s.c + (item.c ?? 0),
          f: s.f + (item.f ?? 0),
        }),
        { p: 0, c: 0, f: 0 },
      );
      return { p: acc.p + totals.p, c: acc.c + totals.c, f: acc.f + totals.f };
    },
    { p: 0, c: 0, f: 0 },
  );
}

/**
 * Group records by meal slot. Order is the natural serving order
 * (breakfast → lunch → dinner → snack).
 */
export function groupByMealSlot(records: FoodRecord[]): Record<MealSlot, FoodRecord[]> {
  const groups: Record<MealSlot, FoodRecord[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  for (const r of records) groups[r.mealSlot].push(r);
  return groups;
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Local UUID generator — same fallback strategy as `weight.ts`. Kept in
 * this file to avoid an extra import dance in a hot path.
 */
function cryptoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
