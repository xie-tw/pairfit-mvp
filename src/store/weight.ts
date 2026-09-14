import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Unit } from './auth';

/**
 * Weight log entries.
 *
 * One record per user-submitted reading. `recordedAt` is the *server-equivalent*
 * timestamp — i.e. `Date.now()` at save time — so a single day's multiple
 * entries stay ordered. `source` distinguishes voice vs manual for the
 * "voice input success rate" metric.
 */
export interface WeightRecord {
  id: string;
  userId: string;
  weight: number;
  unit: Unit;
  recordedAt: number;
  source: 'manual' | 'voice';
}

export const WEIGHT_KEY = 'pairfit:weights';

/** Maximum number of records the home/trend list shows. */
export const RECENT_WEIGHT_LIMIT = 7;

interface WeightState {
  records: WeightRecord[];
  /** Append a new reading. The store assigns `id` and freezes `recordedAt`. */
  addRecord: (input: Omit<WeightRecord, 'id' | 'recordedAt'>) => WeightRecord;
  /** Bulk seed — used by tests / sample data. */
  setRecords: (records: WeightRecord[]) => void;
  /** Wipe everything for this device. */
  clearRecords: () => void;
}

/**
 * Weight log. Persisted under `pairfit:weights`. Records are kept in
 * insertion order — sorting happens at read time so the stored shape is
 * stable (important for diffing).
 */
export const useWeightStore = create<WeightState>()(
  persist(
    (set) => ({
      records: [],

      addRecord: (input) => {
        const record: WeightRecord = {
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
      name: WEIGHT_KEY,
      partialize: (state) => ({ records: state.records }),
    },
  ),
);

/**
 * Local UUID generator that doesn't pull `lib/crypto` into a hot path —
 * `crypto.randomUUID` is available in every browser we ship to, but the
 * fallback in `lib/crypto.uuid` is fine to reuse. Avoids a circular import.
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

/** Sort records oldest → newest (mutates a copy). */
export function sortByDateAsc(records: WeightRecord[]): WeightRecord[] {
  return [...records].sort((a, b) => a.recordedAt - b.recordedAt);
}

/** Sort records newest → newest — for the "history" list. */
export function sortByDateDesc(records: WeightRecord[]): WeightRecord[] {
  return [...records].sort((a, b) => b.recordedAt - a.recordedAt);
}

/** Filter to a trailing window of `days` from `now`. */
export function withinDays(records: WeightRecord[], days: number, now = Date.now()): WeightRecord[] {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return records.filter((r) => r.recordedAt >= cutoff);
}

/**
 * Pick the latest reading at-or-before `at`. Returns `undefined` if the
 * store is empty. Used by the home / trends cards to display "current".
 */
export function latestBefore(records: WeightRecord[], at = Date.now()): WeightRecord | undefined {
  let candidate: WeightRecord | undefined;
  for (const r of records) {
    if (r.recordedAt > at) continue;
    if (!candidate || r.recordedAt > candidate.recordedAt) candidate = r;
  }
  return candidate;
}

/**
 * Convenience hook — returns records sorted newest-first, memoized at the
 * caller. Subscribes to the array reference, so updates re-render correctly.
 */
export function useWeightRecords(): WeightRecord[] {
  return useWeightStore((s) => s.records);
}
