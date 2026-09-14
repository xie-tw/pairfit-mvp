import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Flame, Scale, TrendingDown, TrendingUp, Utensils } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { WeightChart } from '../components/ui/WeightChart';
import { CaloriesChart } from '../components/ui/CaloriesChart';
import { ExerciseChart } from '../components/ui/ExerciseChart';
import { WeeklyReportCard } from '../components/ui/WeeklyReportCard';
import { PartnerCompare } from '../components/ui/PartnerCompare';
import { useCurrentUser } from '../store/auth';
import { usePartnerUser } from '../store/partnerData';
import { useGoalStore, projectGoalCurve, weeksToTarget } from '../store/goal';
import { sortByDateAsc, useWeightStore, withinDays } from '../store/weight';
import { useFoodStore } from '../store/food';
import { useExerciseStore } from '../store/exercise';
import { fromKg, toKg } from '../lib/units';
import { cn } from '../lib/utils';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Generic trailing-window filter — food / exercise stores only ship
 * `withinDay()` (single day), but Trends needs 7/30/90 day windows.
 * Inlining the cutoff keeps the three charts in sync without changing
 * the per-store APIs.
 */
function withinDaysGeneric<T extends { recordedAt: number }>(
  records: T[],
  days: number,
  now = Date.now(),
): T[] {
  const cutoff = now - days * MS_PER_DAY;
  return records.filter((r) => r.recordedAt >= cutoff);
}

type MetricTab = 'weight' | 'calories' | 'exercise';
type WindowDays = '7' | '30' | '90';

const WINDOW_OPTIONS: Array<{ key: WindowDays; days: number }> = [
  { key: '7', days: 7 },
  { key: '30', days: 30 },
  { key: '90', days: 90 },
];

/**
 * Trends tab — PF-8 surface.
 *
 * Layout (top → bottom):
 *   1. Three-tab metric switcher (weight / calories / exercise).
 *   2. Window picker (7 / 30 / 90 days) — shared across the three charts.
 *   3. The active chart, with an optional partner overlay when the user
 *      has bound a partner on the same device.
 *   4. AI weekly report — fetched once per ISO week, cached in
 *      `pairfit:weeklyReport`. A manual refresh button lets the user
 *      re-run for the current week (PM spec).
 *   5. Partner compare card — only renders when bound.
 *   6. Three "stat tiles" — only meaningful for the weight tab; hidden
 *      for calories / exercise so the page doesn't grow into a wall.
 *
 * The calorie / exercise tabs reuse the same bucket-by-day shape as
 * the weight chart so the three charts feel like siblings rather than
 * three unrelated widgets. The window picker is shared for the same
 * reason — switching days keeps the user's mental model in one place.
 */
export function TrendsPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const unit = user?.unit ?? 'kg';

  const records = useWeightStore((s) => s.records);
  const foodRecords = useFoodStore((s) => s.records);
  const exerciseRecords = useExerciseStore((s) => s.records);
  const goal = useGoalStore((s) => s.goal);

  const partner = usePartnerUser();
  // MVP: a single device only stores one goal in `pairfit:goal` (the
  // current user's). Partners on the same device don't bring their own
  // goal — that data would live on the partner's own device in v1.1.
  // Pass `null` to PartnerCompare and let it render the "not set" tile.
  const partnerGoal = null;

  const [metric, setMetric] = useState<MetricTab>('weight');
  const [windowKey, setWindowKey] = useState<WindowDays>('30');
  const windowDays = useMemo(
    () => WINDOW_OPTIONS.find((w) => w.key === windowKey)?.days ?? 30,
    [windowKey],
  );

  const windowWeights = useMemo(() => withinDays(records, windowDays), [records, windowDays]);
  const windowFoods = useMemo(
    () => withinDaysGeneric(foodRecords, windowDays),
    [foodRecords, windowDays],
  );
  const windowExercises = useMemo(
    () => withinDaysGeneric(exerciseRecords, windowDays),
    [exerciseRecords, windowDays],
  );

  // Partner data — scoped by userId so two accounts on the same device
  // never bleed into each other's charts.
  const partnerFoods = useMemo(
    () => (partner ? foodRecords.filter((r) => r.userId === partner.id) : []),
    [foodRecords, partner],
  );
  const partnerExercises = useMemo(
    () => (partner ? exerciseRecords.filter((r) => r.userId === partner.id) : []),
    [exerciseRecords, partner],
  );

  const goalCurve = useMemo(() => (goal ? projectGoalCurve(goal) : null), [goal]);

  // Compute "current vs goal" stats in canonical kg, then re-render in
  // the user's display unit. Mixing kg / lb entries directly is unsafe —
  // we always go through kg as the pivot.
  const weightStats = useMemo(() => {
    if (!goal) return null;
    const sorted = sortByDateAsc(records);
    if (sorted.length === 0) return null;
    const latest = sorted[sorted.length - 1]!;
    const latestKg = toKg(latest.weight, latest.unit);
    const targetKg = toKg(goal.targetWeight, goal.unit);
    const startKg = toKg(goal.startWeight, goal.unit);
    const totalDelta = targetKg - startKg;
    if (totalDelta === 0) return null;
    const remaining = targetKg - latestKg;
    const isLose = totalDelta < 0;

    const elapsedWeeks = (Date.now() - goal.startDate) / MS_PER_WEEK;
    const expectedKg = startKg + goal.weeklyRate * elapsedWeeks;
    let pace: 'on' | 'ahead' | 'behind' = 'on';
    if (isLose) {
      if (latestKg < expectedKg - 0.2) pace = 'ahead';
      else if (latestKg > expectedKg + 0.2) pace = 'behind';
    } else {
      if (latestKg > expectedKg + 0.2) pace = 'ahead';
      else if (latestKg < expectedKg - 0.2) pace = 'behind';
    }

    return {
      latest,
      latestDisplay: fromKg(latestKg, unit),
      targetDisplay: fromKg(targetKg, unit),
      remainingKg: Math.abs(remaining),
      remainingDisplay: Math.abs(fromKg(remaining, unit)),
      weeksLeft: weeksToTarget({
        startWeight: goal.startWeight,
        targetWeight: goal.targetWeight,
        weeklyRate: goal.weeklyRate,
      }),
      pace,
    };
  }, [goal, records, unit]);

  const paceKey =
    weightStats?.pace === 'ahead'
      ? 'trends.aheadOfPace'
      : weightStats?.pace === 'behind'
        ? 'trends.behindPace'
        : 'trends.onPace';

  // 7-day totals — used by the partner compare card. We slice here
  // rather than inside the component so the same numbers show in both
  // charts and the compare card.
  const weekWindow = useMemo(() => withinDays(records, 7), [records]);
  const weekFood = useMemo(() => withinDaysGeneric(foodRecords, 7), [foodRecords]);
  const weekExercise = useMemo(() => withinDaysGeneric(exerciseRecords, 7), [exerciseRecords]);
  const partnerWeekWeights = useMemo(
    () => (partner ? weekWindow.filter((r) => r.userId === partner.id) : []),
    [weekWindow, partner],
  );
  const partnerWeekFood = useMemo(
    () => (partner ? weekFood.filter((r) => r.userId === partner.id) : []),
    [weekFood, partner],
  );
  const partnerWeekExercise = useMemo(
    () => (partner ? weekExercise.filter((r) => r.userId === partner.id) : []),
    [weekExercise, partner],
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title={t('trends.title')} subtitle={t('trends.subtitle')} />

      {/* Metric + window picker — both row-locked so the user always sees
          which scope they're looking at without scrolling. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Tabs<MetricTab>
          ariaLabel={t('trends.title')}
          value={metric}
          onChange={setMetric}
          options={[
            { key: 'weight', label: t('trends.tabWeight') },
            { key: 'calories', label: t('trends.tabCalories') },
            { key: 'exercise', label: t('trends.tabExercise') },
          ]}
        />
        <Tabs<WindowDays>
          ariaLabel="window"
          value={windowKey}
          onChange={setWindowKey}
          options={WINDOW_OPTIONS.map((w) => ({ key: w.key, label: t(`trends.window${w.key}`) }))}
          size="sm"
        />
      </div>

      {/* Active chart — picked by `metric`. Each card keeps the same
          outer chrome (title + metric icon) so the swap feels like a
          filter rather than a page change. */}
      {metric === 'weight' ? (
        <Card raised>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
                {t('trends.weightTitle')}
              </p>
              <p className="mt-0.5 text-sm text-[rgb(var(--fg-secondary))]">
                {t('trends.weightSubtitle')}
              </p>
            </div>
            <div
              aria-hidden
              className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
            >
              <Scale className="size-5" />
            </div>
          </div>

          <div className="mt-4">
            <WeightChart
              records={windowWeights}
              goalCurve={windowDays >= 7 ? goalCurve : null}
              goalWeight={goal?.targetWeight ?? null}
              unit={unit}
              windowDays={windowDays}
            />
          </div>

          {!goal ? (
            <p className="mt-3 text-center text-xs text-[rgb(var(--fg-secondary))]">
              {t('trends.noGoal')}
            </p>
          ) : null}

          {partner ? (
            <p className="mt-2 text-center text-[11px] text-[rgb(var(--fg-subtle))]">
              {t('trends.partnerOverlay')} · {partner.displayName}
            </p>
          ) : null}
        </Card>
      ) : metric === 'calories' ? (
        <Card raised>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
                {t('trends.caloriesTitle')}
              </p>
              <p className="mt-0.5 text-sm text-[rgb(var(--fg-secondary))]">
                {t('trends.caloriesSubtitle')}
              </p>
            </div>
            <div
              aria-hidden
              className="flex size-10 items-center justify-center rounded-xl bg-accent-100 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300"
            >
              <Utensils className="size-5" />
            </div>
          </div>

          <div className="mt-4">
            <CaloriesChart
              records={windowFoods}
              windowDays={windowDays}
              secondaryRecords={partner ? partnerFoods : null}
            />
          </div>

          {partner ? (
            <p className="mt-2 text-center text-[11px] text-[rgb(var(--fg-subtle))]">
              {t('trends.partnerOverlay')} · {partner.displayName}
            </p>
          ) : null}
        </Card>
      ) : (
        <Card raised>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
                {t('trends.exerciseTitle')}
              </p>
              <p className="mt-0.5 text-sm text-[rgb(var(--fg-secondary))]">
                {t('trends.exerciseSubtitle')}
              </p>
            </div>
            <div
              aria-hidden
              className="flex size-10 items-center justify-center rounded-xl bg-warning-soft text-warning dark:bg-warning/15"
            >
              <Flame className="size-5" />
            </div>
          </div>

          <div className="mt-4">
            <ExerciseChart
              records={windowExercises}
              windowDays={windowDays}
              secondaryRecords={partner ? partnerExercises : null}
            />
          </div>

          {partner ? (
            <p className="mt-2 text-center text-[11px] text-[rgb(var(--fg-subtle))]">
              {t('trends.partnerOverlay')} · {partner.displayName}
            </p>
          ) : null}
        </Card>
      )}

      {/* AI weekly report — sits directly under the chart so the user can
          glance at the curve, then read the recap without scrolling
          past unrelated widgets. */}
      <div className="mt-4">
        <WeeklyReportCard
          weights={records}
          foods={foodRecords}
          exercises={exerciseRecords}
          goal={goal}
          allowRefresh
        />
      </div>

      {/* Partner compare — only renders when bound. Renders inside its
          own card so it doesn't feel tacked-on to the AI report. */}
      {partner ? (
        <div className="mt-4">
          <PartnerCompare
            me={user!}
            partner={partner}
            myWeightsCount={weekWindow.length}
            partnerWeightsCount={partnerWeekWeights.length}
            myFoodsCount={weekFood.length}
            partnerFoodsCount={partnerWeekFood.length}
            myExercisesCount={weekExercise.length}
            partnerExercisesCount={partnerWeekExercise.length}
            myGoal={goal}
            partnerGoal={partnerGoal}
          />
        </div>
      ) : null}

      {/* Weight-specific stat tiles — kept below the report so the user
          sees the AI's recap first and the raw stats second. Hidden for
          the calories / exercise tabs because the pace math doesn't
          generalize. */}
      {metric === 'weight' && weightStats ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard
            tone="brand"
            icon={<TrendingDown className="size-5" aria-hidden />}
            label={t('trends.goalDifference', {
              diff: weightStats.remainingDisplay.toFixed(1),
              unit,
            })}
            value={
              weightStats.remainingKg < 0.05
                ? t('trends.goalReached')
                : `${weightStats.remainingDisplay.toFixed(1)} ${unit}`
            }
            sublabel={t('trends.weeksLeft', { count: weightStats.weeksLeft.toFixed(1) })}
          />
          <StatCard
            tone={weightStats.pace === 'behind' ? 'warning' : weightStats.pace === 'ahead' ? 'success' : 'accent'}
            icon={
              weightStats.pace === 'behind' ? (
                <TrendingDown className="size-5" aria-hidden />
              ) : weightStats.pace === 'ahead' ? (
                <TrendingUp className="size-5" aria-hidden />
              ) : (
                <Flame className="size-5" aria-hidden />
              )
            }
            label={t(paceKey)}
            value=""
          />
          <StatCard
            tone="accent"
            icon={<Calendar className="size-5" aria-hidden />}
            label={t('trends.etaLabel')}
            value={new Date(goal!.targetDate).toLocaleDateString()}
            sublabel={t('trends.planLine', {
              value: Math.abs(goal!.weeklyRate),
              unit: goal!.unit,
            })}
          />
        </div>
      ) : null}
    </div>
  );
}

interface StatCardProps {
  tone: 'brand' | 'accent' | 'success' | 'warning';
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
}

function StatCard({ tone, icon, label, value, sublabel }: StatCardProps) {
  const toneClass = {
    brand: 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
    accent: 'bg-accent-100 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
    success: 'bg-success-soft text-success dark:bg-success/15',
    warning: 'bg-warning-soft text-warning dark:bg-warning/15',
  }[tone];

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div aria-hidden className={cn('flex size-10 items-center justify-center rounded-xl', toneClass)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
            {label}
          </p>
          <p className="text-lg font-bold leading-tight text-[rgb(var(--fg-primary))]">
            {value}
          </p>
          {sublabel ? (
            <p className="text-[11px] text-[rgb(var(--fg-subtle))]">{sublabel}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
