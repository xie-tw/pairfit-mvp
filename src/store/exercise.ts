import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Exercise (workout) log entries — PF-5.
 *
 * Mirrors the PRD §16.3 spec: one record per workout session. The
 * estimate (`estimatedCalories`) is computed at save time so the history
 * list can show "X kcal" without re-running the MET formula every render.
 *
 * `source: 'manual' | 'voice'` powers the "voice input success rate"
 * metric in PRD §11.3 — keeping it on every record means we can audit
 * the funnel without joining against another store.
 */

export type ExerciseType =
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'strength'
  | 'yoga'
  | 'elliptical'
  | 'rope'
  | 'pilates'
  | 'other';

export type Intensity = 'low' | 'medium' | 'high';

export interface ExerciseRecord {
  id: string;
  userId: string;
  type: ExerciseType;
  durationMin: number;
  intensity: Intensity;
  estimatedCalories: number;
  recordedAt: number;
  source: 'manual' | 'voice';
}

export const EXERCISE_KEY = 'pairfit:exercise';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface ExerciseState {
  records: ExerciseRecord[];
  /** Append a new session. The store assigns `id` and freezes `recordedAt`. */
  addRecord: (input: Omit<ExerciseRecord, 'id' | 'recordedAt'>) => ExerciseRecord;
  /** Bulk seed — used by tests / sample data. */
  setRecords: (records: ExerciseRecord[]) => void;
  /** Wipe everything for this device. */
  clearRecords: () => void;
}

/**
 * Exercise log. Persisted under `pairfit:exercise`. Same pattern as the
 * weight store: records live in insertion order, sorting happens at read
 * time so the on-disk shape stays stable.
 */
export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set) => ({
      records: [],

      addRecord: (input) => {
        const record: ExerciseRecord = {
          ...input,
          id: cryptoId(),
          recordedAt: Date.now(),
        };
        set((state) => ({ records: [...state.records, record] }));
        return record;
      },

      setRecords: (records) => set({ records }),

      clearRecords: () => set({ records: [] }),
    }),
    {
      name: EXERCISE_KEY,
      partialize: (state) => ({ records: state.records }),
    },
  ),
);

/**
 * Local UUID generator that doesn't pull `lib/crypto` into a hot path —
 * mirrors the one in `weight.ts` / `food.ts`. Avoids a circular import
 * (those stores also live in this directory).
 */
function cryptoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback — same RFC-4122 v4 layout as `lib/crypto.uuid`.
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

/* -------------------------------------------------------------------------- */
/* Read helpers — kept here so pages don't each reimplement the same filters. */
/* -------------------------------------------------------------------------- */

/** Sort newest → oldest. Mutates a copy. */
export function sortByDateDesc(records: ExerciseRecord[]): ExerciseRecord[] {
  return [...records].sort((a, b) => b.recordedAt - a.recordedAt);
}

/** Filter to a single calendar day's records (local time). */
export function withinDay(records: ExerciseRecord[], at = Date.now()): ExerciseRecord[] {
  const startOfDay = startOfLocalDay(at);
  const endOfDay = startOfDay + MS_PER_DAY;
  return records.filter((r) => r.recordedAt >= startOfDay && r.recordedAt < endOfDay);
}

/** Sum minutes over a slice of records. */
export function sumDuration(records: ExerciseRecord[]): number {
  return records.reduce((sum, r) => sum + r.durationMin, 0);
}

/** Sum kcal over a slice of records. */
export function sumCalories(records: ExerciseRecord[]): number {
  return records.reduce((sum, r) => sum + r.estimatedCalories, 0);
}

/**
 * Aggregate minutes by exercise type. Order follows the catalog order
 * (see `lib/exercise.EXERCISE_TYPE_ORDER`); types with zero minutes are
 * omitted so the chart legend doesn't have empty rows.
 */
export function minutesByType(records: ExerciseRecord[]): Array<{ type: ExerciseType; minutes: number; calories: number }> {
  const acc = new Map<ExerciseType, { minutes: number; calories: number }>();
  for (const r of records) {
    const cur = acc.get(r.type) ?? { minutes: 0, calories: 0 };
    cur.minutes += r.durationMin;
    cur.calories += r.estimatedCalories;
    acc.set(r.type, cur);
  }
  return Array.from(acc.entries()).map(([type, v]) => ({ type, ...v }));
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}