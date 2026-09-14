import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Unit } from './auth';

/**
 * User-set weight goal.
 *
 * Shape mirrors the PRD §16.3 spec. We keep it on its own slot (instead of
 * nesting inside the user record) so updates don't have to round-trip
 * through the obfuscated auth store — and so a user can finish registration
 * without immediately being forced to set a goal (the page redirects them
 * once they're signed in).
 */
export type GoalDirection = 'lose' | 'gain';
export type WeeklyRate = -0.5 | -0.25 | -0.1 | 0.1 | 0.3 | 0.5;

export interface Goal {
  direction: GoalDirection;
  startWeight: number;
  targetWeight: number;
  weeklyRate: WeeklyRate;
  unit: Unit;
  /** Timestamp the user committed to the goal — also the curve's anchor. */
  startDate: number;
  /** Derived from the delta / weekly rate — cached so the chart is cheap. */
  targetDate: number;
}

/** Pace presets the slider snaps to. Sign matches the user's direction. */
export const WEEKLY_RATE_PRESETS: WeeklyRate[] = [
  -0.5, -0.25, -0.1, 0.1, 0.3, 0.5,
];

export const GOAL_KEY = 'pairfit:goal';

/**
 * `weeksToTarget` — total weeks the curve spans. Returned as `Infinity`
 * (theoretically) when the chosen pace can't reach the goal (e.g. zero
 * delta); callers should never let that happen via the slider lock.
 */
export function weeksToTarget(goal: Pick<Goal, 'startWeight' | 'targetWeight' | 'weeklyRate'>): number {
  const delta = goal.targetWeight - goal.startWeight;
  if (delta === 0) return 0;
  // For a `lose` direction the weekly rate is negative; the sign of the
  // delta + sign of the rate are aligned by UI validation, so we always
  // divide signed-by-signed.
  return Math.abs(delta / goal.weeklyRate);
}

/**
 * Compute the target date by adding `weeksToTarget` weeks to `startDate`.
 * Returns the same instant if the math collapses (zero delta).
 */
export function computeTargetDate(goal: Omit<Goal, 'targetDate'>): number {
  const weeks = weeksToTarget(goal);
  if (!isFinite(weeks) || weeks <= 0) return goal.startDate;
  const ms = weeks * 7 * 24 * 60 * 60 * 1000;
  return goal.startDate + ms;
}

interface GoalState {
  goal: Goal | null;
  setGoal: (next: Omit<Goal, 'targetDate'>) => void;
  updateGoal: (patch: Partial<Omit<Goal, 'targetDate'>>) => void;
  clearGoal: () => void;
}

/**
 * Goal store. Persisted under `pairfit:goal`. Re-derives `targetDate` on
 * every write so the chart doesn't have to recompute on every render.
 */
export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goal: null,

      setGoal: (next) => {
        const targetDate = computeTargetDate(next);
        set({ goal: { ...next, targetDate } });
      },

      updateGoal: (patch) => {
        const current = get().goal;
        if (!current) return;
        const merged = { ...current, ...patch };
        set({ goal: { ...merged, targetDate: computeTargetDate(merged) } });
      },

      clearGoal: () => set({ goal: null }),
    }),
    {
      name: GOAL_KEY,
      partialize: (state) => ({ goal: state.goal }),
    },
  ),
);

/**
 * Convenience hook — returns the current goal or `null`. Same shape as the
 * zustand selector, but explicit so pages can short-circuit on `null`
 * without re-typing the selector every time.
 */
export function useGoal(): Goal | null {
  return useGoalStore((s) => s.goal);
}

/**
 * Generate the projected weight curve for `goal` — one sample per day from
 * `startDate` to `targetDate`. The line is a straight ramp from start to
 * target (no smoothing); the chart overlays it as a dashed reference.
 */
export interface CurvePoint {
  date: number;
  weight: number;
}

export function projectGoalCurve(goal: Goal): CurvePoint[] {
  const start = goal.startDate;
  const end = goal.targetDate;
  if (end <= start) {
    return [{ date: start, weight: goal.startWeight }];
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.round((end - start) / dayMs));
  const delta = goal.targetWeight - goal.startWeight;
  const points: CurvePoint[] = [];
  for (let i = 0; i <= days; i += 1) {
    const date = start + i * dayMs;
    const t = days === 0 ? 1 : i / days;
    const weight = goal.startWeight + delta * t;
    points.push({ date, weight });
  }
  return points;
}
