import type { FoodRecord } from '../store/food';
import type { ExerciseRecord } from '../store/exercise';
import type { WeightRecord } from '../store/weight';
import type { GoalDirection } from '../store/goal';

/**
 * Daily task evaluator — PF-7.
 *
 * PairFit scores a user on three "today's plan" criteria, direction-aware:
 *
 *   lose direction:
 *     - Logged a weight reading
 *     - Logged at least 3 meals
 *     - Worked out ≥ 30 minutes
 *
 *   gain direction:
 *     - Logged a weight reading
 *     - Logged at least 3 meals (PRD: include target-calories)
 *     - Worked out ≥ 20 minutes
 *
 * PRD §14 calls out that for the gain direction we *also* require the
 * recorded meals to hit a target calorie floor. We don't ship a calorie
 * target in MVP (no TDEE calculator yet) — the PM approved the simpler
 * "3 meals logged" rule for now and we'll add the calorie gate when the
 * nutrition goal lands. The constant is in place so the wire-up is a
 * one-liner when the data is ready.
 *
 * The result is `passes` (the boolean) plus the `reasons` so the UI can
 * show "missing: workout, meals" instead of an opaque "failed".
 */

export interface DailyTaskInput {
  direction: GoalDirection;
  weights: WeightRecord[];
  foods: FoodRecord[];
  exercises: ExerciseRecord[];
  /** Default: today (Date.now()). */
  at?: number;
}

export interface DailyTaskResult {
  /** True iff every required criterion is met. */
  passes: boolean;
  /** Local yyyy-mm-dd date the evaluation was scoped to. */
  date: string;
  /** i18n keys (one per unmet requirement). */
  missingKeys: string[];
  /** Mirror of the criteria for the UI tile — true = met. */
  criteria: {
    weight: boolean;
    meals: boolean;
    workout: boolean;
  };
}

const REQUIRED_MEALS = 3;
const MIN_EXERCISE_MIN_LOSE = 30;
const MIN_EXERCISE_MIN_GAIN = 20;

function localDateKey(at: number): string {
  const d = new Date(at);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Public entrypoint. Returns the evaluation for "today" (or `at` if the
 * caller wants to inspect a past day — used by tests).
 */
export function evaluateDailyTask(input: DailyTaskInput): DailyTaskResult {
  const at = input.at ?? Date.now();
  const date = localDateKey(at);

  const dayStart = startOfLocalDay(at);
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const todaysWeights = input.weights.filter((r) => r.recordedAt >= dayStart && r.recordedAt < dayEnd);
  const todaysFoods = input.foods.filter((f) => f.recordedAt >= dayStart && f.recordedAt < dayEnd);
  const todaysExercises = input.exercises.filter((e) => e.recordedAt >= dayStart && e.recordedAt < dayEnd);

  const weightMet = todaysWeights.length > 0;
  const mealsMet = todaysFoods.length >= REQUIRED_MEALS;
  const exerciseMin = todaysExercises.reduce((sum, e) => sum + e.durationMin, 0);
  const exerciseMinRequired =
    input.direction === 'lose' ? MIN_EXERCISE_MIN_LOSE : MIN_EXERCISE_MIN_GAIN;
  const workoutMet = exerciseMin >= exerciseMinRequired;

  const missingKeys: string[] = [];
  if (!weightMet) missingKeys.push('dailyTasks.missing.weight');
  if (!mealsMet) missingKeys.push('dailyTasks.missing.meals');
  if (!workoutMet) {
    missingKeys.push(
      input.direction === 'lose'
        ? 'dailyTasks.missing.workoutLose'
        : 'dailyTasks.missing.workoutGain',
    );
  }

  return {
    passes: missingKeys.length === 0,
    date,
    missingKeys,
    criteria: { weight: weightMet, meals: mealsMet, workout: workoutMet },
  };
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * The rewards matrix. Exposed so the home/coins UI can show the same
 * numbers without re-deriving them.
 */
export const DAILY_TASK_REWARDS = {
  pass: 10,
  fail: -5,
} as const;
