import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Flame, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { WeightChart } from '../components/ui/WeightChart';
import { useCurrentUser } from '../store/auth';
import { useGoalStore, projectGoalCurve, weeksToTarget } from '../store/goal';
import { sortByDateAsc, useWeightStore, withinDays } from '../store/weight';
import { fromKg, toKg } from '../lib/units';
import { cn } from '../lib/utils';

type Window = '7' | '30' | '90';

const WINDOW_OPTIONS: Array<{ key: Window; days: number }> = [
  { key: '7', days: 7 },
  { key: '30', days: 30 },
  { key: '90', days: 90 },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Trends tab — full weight trend with 7 / 30 / 90 day windows and a
 * goal reference line.
 *
 * The page is intentionally lean — food + workout charts land in PF-8.
 * We surface three "stat tiles" above the chart: current reading,
 * distance to target, and pace status (on-track / ahead / behind).
 */
export function TrendsPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const unit = user?.unit ?? 'kg';
  const records = useWeightStore((s) => s.records);
  const goal = useGoalStore((s) => s.goal);
  const [window, setWindow] = useState<Window>('30');

  const windowDays = useMemo(
    () => WINDOW_OPTIONS.find((w) => w.key === window)?.days ?? 30,
    [window],
  );

  const windowRecords = useMemo(() => withinDays(records, windowDays), [records, windowDays]);
  const goalCurve = useMemo(() => (goal ? projectGoalCurve(goal) : null), [goal]);

  // Compute "current vs goal" stats in canonical kg, then re-render in the
  // user's display unit. Mixing kg / lb entries directly is unsafe — we
  // always go through kg as the pivot.
  const stats = useMemo(() => {
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

    // Pace comparison: where should the user be right now vs where they are.
    const elapsedWeeks = (Date.now() - goal.startDate) / (MS_PER_DAY * 7);
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
      weeksLeft: weeksToTarget({ startWeight: goal.startWeight, targetWeight: goal.targetWeight, weeklyRate: goal.weeklyRate }),
      pace,
    };
  }, [goal, records, unit]);

  // BUG-FIX-1 (follow-up): pace status → i18n key. The previous
  // implementation keyed the "behind" branch to `behindOfPace` (a key
  // that doesn't exist); map each branch to its real key explicitly so
  // the lookup never goes stale again.
  const paceKey =
    stats?.pace === 'ahead'
      ? 'trends.aheadOfPace'
      : stats?.pace === 'behind'
        ? 'trends.behindPace'
        : 'trends.onPace';

  return (
    <div className="animate-fade-in">
      <PageHeader title={t('trends.title')} subtitle={t('trends.subtitle')} />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[rgb(var(--fg-primary))]">
          {t('trends.weightTitle')}
        </h2>
        <Tabs<Window>
          ariaLabel={t('trends.weightTitle')}
          value={window}
          onChange={setWindow}
          options={WINDOW_OPTIONS.map((w) => ({ key: w.key, label: t(`trends.window${w.key}`) }))}
          size="sm"
        />
      </div>

      <Card raised>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
              {t('home.weightCardTitle')}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[rgb(var(--fg-primary))]">
              {stats ? `${stats.latestDisplay.toFixed(1)} ${unit}` : '—'}
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
            records={windowRecords}
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
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          tone="brand"
          icon={<TrendingDown className="size-5" aria-hidden />}
          label={stats ? t('trends.goalDifference', { diff: stats.remainingDisplay.toFixed(1), unit }) : t('home.weightEmpty')}
          value={stats ? (stats.remainingKg < 0.05 ? t('trends.goalReached') : `${stats.remainingDisplay.toFixed(1)} ${unit}`) : '—'}
          sublabel={stats ? t('trends.weeksLeft', { count: stats.weeksLeft.toFixed(1) }) : ''}
        />
        <StatCard
          tone={stats?.pace === 'behind' ? 'warning' : stats?.pace === 'ahead' ? 'success' : 'accent'}
          icon={
            stats?.pace === 'behind' ? <TrendingDown className="size-5" aria-hidden /> :
            stats?.pace === 'ahead' ? <TrendingUp className="size-5" aria-hidden /> :
            <Flame className="size-5" aria-hidden />
          }
          label={stats ? t(paceKey) : ''}
          value=""
        />
        <StatCard
          tone="accent"
          icon={<Calendar className="size-5" aria-hidden />}
          label={goal ? t('trends.etaLabel') : ''}
          value={goal ? new Date(goal.targetDate).toLocaleDateString() : '—'}
          sublabel={goal ? t('trends.planLine', { value: Math.abs(goal.weeklyRate), unit: goal.unit }) : ''}
        />
      </div>
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
