import { useMemo } from 'react';
import { ArrowRight, Flame, Scale, Sparkles, TrendingUp, Utensils } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useCurrentUser } from '../store/auth';
import { useGoalStore } from '../store/goal';
import { latestBefore, sortByDateDesc, useWeightStore } from '../store/weight';
import { sumCalories, groupByMealSlot, withinDay, useFoodStore } from '../store/food';
import { fromKg, toKg } from '../lib/units';
import { cn } from '../lib/utils';

/**
 * Home — landing tab.
 *
 * PF-3 scope:
 *   - Real weight progress card wired to the goal + latest reading.
 *   - Empty state when no goal is set (with CTA into onboarding).
 *   - Recent weight list (top 3) under a "today's plan" section.
 *
 * What's still stubbed:
 *   - Partner progress card — needs PF-6 (couple binding) to populate.
 *   - Food / workout cards — PF-4 / PF-5.
 */
export function HomePage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const unit = user?.unit ?? 'kg';
  const goal = useGoalStore((s) => s.goal);
  const records = useWeightStore((s) => s.records);
  const foodRecords = useFoodStore((s) => s.records);

  const latest = useMemo(() => latestBefore(records), [records]);
  const recent = useMemo(() => sortByDateDesc(records).slice(0, 3), [records]);
  const todaysFood = useMemo(() => withinDay(foodRecords), [foodRecords]);
  const todayCalories = useMemo(() => sumCalories(todaysFood), [todaysFood]);
  const mealsBySlot = useMemo(() => groupByMealSlot(todaysFood), [todaysFood]);

  const progress = useMemo(() => {
    if (!goal || !latest) return null;
    const startKg = toKg(goal.startWeight, goal.unit);
    const targetKg = toKg(goal.targetWeight, goal.unit);
    const currentKg = toKg(latest.weight, latest.unit);
    const totalDelta = targetKg - startKg;
    if (totalDelta === 0) return null;
    const covered = currentKg - startKg;
    const ratio = covered / totalDelta;
    return {
      ratio: Math.max(0, Math.min(1.5, ratio)),
      currentDisplay: fromKg(currentKg, unit),
      targetDisplay: fromKg(targetKg, unit),
      remaining: Math.abs(targetKg - currentKg),
    };
  }, [goal, latest, unit]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t('home.title')}
        subtitle={t('home.subtitle')}
        trailing={
          <button
            type="button"
            className="pf-press inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--fg-primary))] hover:bg-[rgb(var(--bg-sunken))]"
          >
            <Flame className="size-3.5 text-brand-500" aria-hidden />
            <span>{t('home.streak')}</span>
            <Sparkles className="size-3.5 text-[rgb(var(--fg-subtle))]" aria-hidden />
          </button>
        }
      />

      {!goal ? (
        <Card raised className="mb-4">
          <EmptyState
            emoji="🎯"
            title={t('home.noGoalTitle')}
            description={t('home.noGoalBody')}
            action={
              <Link to="/onboarding">
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-500 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 pf-press"
                >
                  {t('home.setGoalCta')}
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </Link>
            }
          />
        </Card>
      ) : (
        <ProgressCard
          accent="brand"
          title={t('home.youProgress')}
          currentLabel={progress ? `${progress.currentDisplay.toFixed(1)} ${unit}` : '—'}
          targetLabel={progress ? `${progress.targetDisplay.toFixed(1)} ${unit}` : '—'}
          ratio={progress?.ratio ?? 0}
          hint={
            progress && progress.remaining > 0
              ? t('home.remaining', {
                  amount: progress.remaining.toFixed(1),
                  unit,
                })
              : progress
              ? t('trends.goalReached')
              : t('home.weightEmpty')
          }
          goal={goal}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <PartnerCard />
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="pf-section-title">{t('home.todayGoal')}</h2>
          <Link
            to="/records/weight"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            {t('home.logWeight')}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        <Card>
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
            >
              <Scale className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
                {t('home.weightCardTitle')}
              </h3>
              <p className="text-xs text-[rgb(var(--fg-secondary))]">
                {latest
                  ? `${t('home.weightLatest')}: ${latest.weight.toFixed(1)} ${latest.unit}`
                  : t('home.weightEmpty')}
              </p>
            </div>
            <Link
              to="/records/weight"
              className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-brand-500 px-3 text-xs font-medium text-white shadow-sm hover:bg-brand-600 pf-press"
            >
              {t('home.logWeight')}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          {recent.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg bg-[rgb(var(--bg-sunken))]/60 px-3 py-2 text-xs"
                >
                  <span className="font-medium text-[rgb(var(--fg-primary))]">
                    {r.weight.toFixed(1)} {r.unit}
                  </span>
                  <span className="text-[rgb(var(--fg-secondary))]">
                    {new Date(r.recordedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="pf-section-title">{t('home.foodCardTitle')}</h2>
          <Link
            to="/records/food"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            {t('home.logFood')}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        <Card>
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning-foreground dark:bg-warning/20 dark:text-warning"
            >
              <Utensils className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
                {t('home.foodCardTitle')}
              </h3>
              <p className="text-xs text-[rgb(var(--fg-secondary))]">
                {todayCalories > 0
                  ? t('home.foodToday', { value: Math.round(todayCalories) })
                  : t('home.foodEmpty')}
              </p>
            </div>
            <Link
              to="/records/food"
              className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-brand-500 px-3 text-xs font-medium text-white shadow-sm hover:bg-brand-600 pf-press"
            >
              {t('home.logFood')}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          {todaysFood.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((slot) => {
                const list = mealsBySlot[slot];
                if (list.length === 0) return null;
                const slotTotal = sumCalories(list);
                return (
                  <li
                    key={slot}
                    className="flex items-center justify-between rounded-lg bg-[rgb(var(--bg-sunken))]/60 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-[rgb(var(--fg-primary))]">
                      {t(`record.food.meal_${slot}`)}
                    </span>
                    <span className="text-[rgb(var(--fg-secondary))]">
                      {Math.round(slotTotal)} kcal
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Card>
      </section>
    </div>
  );
}

interface ProgressCardProps {
  accent: 'brand' | 'accent';
  title: string;
  currentLabel: string;
  targetLabel: string;
  ratio: number;
  hint: string;
  goal?: import('../store/goal').Goal | null;
}

function ProgressCard({ accent, title, currentLabel, targetLabel, ratio, hint, goal }: ProgressCardProps) {
  return (
    <Card raised className="mb-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[rgb(var(--fg-primary))]">
            {currentLabel}
            <span className="ml-1 text-base font-medium text-[rgb(var(--fg-subtle))]">
              / {targetLabel}
            </span>
          </p>
        </div>
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-full',
            accent === 'brand'
              ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
              : 'bg-accent-100 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
          )}
          aria-hidden
        >
          <TrendingUp className="size-5" />
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar
          value={ratio}
          max={1}
          tone={accent === 'brand' ? 'brand' : 'accent'}
          showLabel
          ariaLabel={`${title} progress`}
        />
      </div>
      <p className="mt-3 text-xs text-[rgb(var(--fg-subtle))]">{hint}</p>
      {goal ? <GoalFooter goal={goal} /> : null}
    </Card>
  );
}

function GoalFooter({ goal }: { goal: import('../store/goal').Goal }) {
  const { t } = useTranslation();
  const pace = t('onboarding.weeklyPaceValue', {
    value: Math.abs(goal.weeklyRate).toFixed(goal.weeklyRate % 1 === 0 ? 0 : 2),
    unit: goal.unit,
  });
  const target = new Date(goal.targetDate).toLocaleDateString();
  return (
    <p className="mt-1 text-[11px] text-[rgb(var(--fg-subtle))]">
      {t('home.planFooter', { pace, date: target })}
    </p>
  );
}

function PartnerCard() {
  const { t } = useTranslation();
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full bg-accent-100 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300"
        >
          <TrendingUp className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
            {t('home.partnerProgress')}
          </p>
          <p className="mt-1 text-sm font-semibold text-[rgb(var(--fg-primary))]">
            {t('home.partnerBindPrompt')}
          </p>
          <p className="text-xs text-[rgb(var(--fg-secondary))]">
            {t('home.partnerComingSoon')}
          </p>
        </div>
      </div>
    </Card>
  );
}
