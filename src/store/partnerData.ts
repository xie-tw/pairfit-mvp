import { useMemo } from 'react';
import { useAuthStore, useCurrentUser } from './auth';
import { useWeightStore } from './weight';
import { useFoodStore } from './food';
import { useExerciseStore } from './exercise';
import type { UserRecord } from './auth';

/**
 * Partner-data helpers — PF-8.
 *
 * MVP constraint (per the project PRD): partner records have to live on
 * the same device / browser profile. Both accounts are in
 * `useAuthStore.users`, so the partner's weights / foods / exercises are
 * right there — we just need to scope them by `userId`.
 *
 * These hooks read the *partner's* data without subscribing to the
 * current user's stores, so re-renders stay cheap and partner activity
 * doesn't trigger needless work in the current-user view.
 */

/** Get the bound partner's record (same device) — `null` when single. */
export function usePartnerUser(): UserRecord | null {
  const me = useCurrentUser();
  const users = useAuthStore((s) => s.users);
  return useMemo(() => {
    if (!me?.partnerId) return null;
    return users.find((u) => u.id === me.partnerId) ?? null;
  }, [me, users]);
}

/**
 * Filter the weight / food / exercise stores to entries belonging to
 * `userId`. PairFit's records all carry a `userId`, so this is just a
 * `filter` — but doing it once here means callers don't have to repeat
 * the cast.
 */
export function usePartnerWeights(partnerId: string | null) {
  const records = useWeightStore((s) => s.records);
  return useMemo(() => {
    if (!partnerId) return [];
    return records.filter((r) => r.userId === partnerId);
  }, [records, partnerId]);
}

export function usePartnerFoods(partnerId: string | null) {
  const records = useFoodStore((s) => s.records);
  return useMemo(() => {
    if (!partnerId) return [];
    return records.filter((r) => r.userId === partnerId);
  }, [records, partnerId]);
}

export function usePartnerExercises(partnerId: string | null) {
  const records = useExerciseStore((s) => s.records);
  return useMemo(() => {
    if (!partnerId) return [];
    return records.filter((r) => r.userId === partnerId);
  }, [records, partnerId]);
}
