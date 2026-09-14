import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Dumbbell,
  Flame,
  Heart,
  Scale,
  Sparkles,
  TrendingUp,
  Utensils,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CheerButton } from '../components/cheer/CheerButton';
import { CheerFloater } from '../components/cheer/CheerFloater';
import { useCurrentUser } from '../store/auth';
import { useGoalStore } from '../store/goal';
import {
  latestBefore,
  sortByDateDesc,
  useWeightStore,
} from '../store/weight';
import {
  sumCalories,
  groupByMealSlot,
  withinDay as withinFoodDay,
  useFoodStore,
} from '../store/food';
import { withinDay as withinExerciseDay, useExerciseStore } from '../store/exercise';
import { fromKg, toKg } from '../lib/units';
import { cn } from '../lib/utils';
import {
  CHEER_EMOJIS,
  MAX_DAILY_CHEERS,
  type CheerEmoji,
  useCheerStore,
} from '../store/cheer';
import {
  usePartnerExercises,
  usePartnerFoods,
  usePartnerUser,
  usePartnerWeights,
} from '../store/partnerData';
import { toast } from '../store/toast';

/**
 * Home — landing tab.
 *
 * PF-3 / PF-4 / PF-5: weight / food / exercise progress + goals.
 * PF-6 (this issue): real partner progress card sourced from the
 * partner-data hooks, plus the cheer row + CheerFloater layer. We
 * also surface any unseen cheers as a one-shot toast on mount.
 */
export function HomePage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const unit = user?.unit ?? 'kg';
  const goal = useGoalStore((s) => s.goal);
  const records = useWeightStore((s) => s.records);
  const foodRecords = useFoodStore((s) => s.records);
  const exerciseRecords = useExerciseStore((s) => s.records);

  const partner = usePartnerUser();
  const partnerId = partner?.id ?? null;
  const partnerWeights = usePartnerWeights(partnerId);
  const partnerFoods = usePartnerFoods(partnerId);
  const partnerExercises = usePartnerExercises(partnerId);

  const latest = useMemo(() => latestBefore(records), [records]);
  const recent = useMemo(() => sortByDateDesc(records).slice(0, 3), [records]);
  const todaysFood = useMemo(() => withinFoodDay(foodRecords), [foodRecords]);
  const todayCalories = useMemo(() => sumCalories(todaysFood), [todaysFood]);
  const mealsBySlot = useMemo(() => groupByMealSlot(todaysFood), [todaysFood]);
  const todaysExercise = useMemo(
    () => withinExerciseDay(exerciseRecords),
    [exerciseRecords],
  );
  const todayExerciseMin = useMemo(
    () => todaysExercise.reduce((sum, e) => sum + e.durationMin, 0),
    [todaysExercise],
  );

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

  // Drain unseen received cheers into a one-shot toast. Using a ref
  // keeps the surfaced-id set stable across renders without forcing
  // a re-render when we add to it.
  return (
    <div className="animate-fade-in">
      <ReceivedCheersToaster userId={user?.id ?? null} />
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
        <PartnerCard
          partner={partner}
          todaysWeights={filterToday(partnerWeights)}
          todaysFoods={withinFoodDay(partnerFoods)}
          todaysExercises={withinExerciseDay(partnerExercises)}
        />
        <SelfTodayCard
          hasWeight={!!latest}
          todayCalories={todayCalories}
          todayExerciseMin={todayExerciseMin}
        />
      </div>

      {/* Cheer row — only when bound to a partner. */}
      {user && partner ? <CheerRow userId={user.id} partnerId={partner.id} /> : null}

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

interface PartnerCardProps {
  partner: ReturnType<typeof usePartnerUser>;
  todaysWeights: { recordedAt: number }[];
  todaysFoods: { totalCalories: number }[];
  todaysExercises: { durationMin: number }[];
}

function PartnerCard({ partner, todaysWeights, todaysFoods, todaysExercises }: PartnerCardProps) {
  const { t } = useTranslation();
  if (!partner) {
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
              {t('home.partnerCardTitle')}
            </p>
            <p className="mt-1 text-sm font-semibold text-[rgb(var(--fg-primary))]">
              {t('home.partnerCardEmpty')}
            </p>
            <Link
              to="/couple"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline dark:text-accent-300"
            >
              {t('couple.bind')}
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const foodKcal = Math.round(
    todaysFoods.reduce((sum, f) => sum + f.totalCalories, 0),
  );
  const exerciseMin = todaysExercises.reduce(
    (sum, e) => sum + e.durationMin,
    0,
  );
  const weightDone = todaysWeights.length > 0;

  return (
    <Card raised>
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-brand-500 text-base text-white shadow-sm"
        >
          {partner.avatar ? (
            <span>{partner.avatar}</span>
          ) : (
            <Heart className="size-5" fill="white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
            {t('home.partnerCardTitle')}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-[rgb(var(--fg-primary))]">
            {partner.displayName}
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        <CheckRow
          icon={<Scale className="size-3.5" aria-hidden />}
          label={t('home.partnerWeight')}
          value={
            weightDone
              ? t('home.partnerWeightDone')
              : t('home.partnerWeightEmpty')
          }
          done={weightDone}
        />
        <CheckRow
          icon={<Utensils className="size-3.5" aria-hidden />}
          label={t('home.partnerFood')}
          value={
            foodKcal > 0
              ? t('home.partnerFoodValue', { value: foodKcal })
              : t('home.partnerFoodEmpty')
          }
          done={foodKcal > 0}
        />
        <CheckRow
          icon={<Dumbbell className="size-3.5" aria-hidden />}
          label={t('home.partnerExercise')}
          value={
            exerciseMin > 0
              ? t('home.partnerExerciseValue', { value: exerciseMin })
              : t('home.partnerExerciseEmpty')
          }
          done={exerciseMin > 0}
        />
      </ul>
      <p className="mt-3 text-[10px] text-[rgb(var(--fg-subtle))]">
        {t('home.cheerPrivacyNote')}
      </p>
    </Card>
  );
}

function CheckRow({
  icon,
  label,
  value,
  done,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  done: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-[rgb(var(--bg-sunken))]/60 px-2.5 py-1.5 text-xs">
      <span className="flex min-w-0 items-center gap-1.5 text-[rgb(var(--fg-secondary))]">
        <span aria-hidden className="text-[rgb(var(--fg-subtle))]">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          'flex-shrink-0 font-medium',
          done ? 'text-brand-600 dark:text-brand-300' : 'text-[rgb(var(--fg-subtle))]',
        )}
      >
        {value}
      </span>
    </li>
  );
}

interface SelfTodayCardProps {
  hasWeight: boolean;
  todayCalories: number;
  todayExerciseMin: number;
}

function SelfTodayCard({ hasWeight, todayCalories, todayExerciseMin }: SelfTodayCardProps) {
  const { t } = useTranslation();
  return (
    <Card raised>
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
        >
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
            {t('couple.partnerCard.you')}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[rgb(var(--fg-primary))]">
            {t('home.foodCardTitle')} + {t('home.exerciseCardTitle')}
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        <CheckRow
          icon={<Scale className="size-3.5" aria-hidden />}
          label={t('home.weightCardTitle')}
          value={hasWeight ? t('home.partnerWeightDone') : t('home.partnerWeightEmpty')}
          done={hasWeight}
        />
        <CheckRow
          icon={<Utensils className="size-3.5" aria-hidden />}
          label={t('home.foodCardTitle')}
          value={
            todayCalories > 0
              ? t('home.partnerFoodValue', { value: Math.round(todayCalories) })
              : t('home.partnerFoodEmpty')
          }
          done={todayCalories > 0}
        />
        <CheckRow
          icon={<Dumbbell className="size-3.5" aria-hidden />}
          label={t('home.exerciseCardTitle')}
          value={
            todayExerciseMin > 0
              ? t('home.partnerExerciseValue', { value: todayExerciseMin })
              : t('home.partnerExerciseEmpty')
          }
          done={todayExerciseMin > 0}
        />
      </ul>
    </Card>
  );
}

interface CheerRowProps {
  userId: string;
  partnerId: string;
}

function CheerRow({ userId, partnerId }: CheerRowProps) {
  const { t } = useTranslation();
  const sendCheer = useCheerStore((s) => s.sendCheer);
  const countToday = useCheerStore((s) => s.countToday);
  const sent = countToday(userId, partnerId);
  const [floaters, setFloaters] = useState<{ id: string; emoji: CheerEmoji }[]>(
    [],
  );

  const onSend = (emoji: CheerEmoji) => {
    const result = sendCheer({ fromUserId: userId, toUserId: partnerId, emoji });
    if (result.ok === false) {
      if (result.code === 'limitReached') {
        toast({ variant: 'info', message: t('home.cheerLimitReached') });
      }
      return;
    }
    setFloaters((prev) => [
      ...prev,
      { id: result.cheer.id, emoji: result.cheer.emoji },
    ]);
  };

  const removeFloater = (id: string) => {
    setFloaters((prev) => prev.filter((f) => f.id !== id));
  };

  const limitReached = sent >= MAX_DAILY_CHEERS;

  return (
    <section className="mt-4">
      <Card raised>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
              {t('home.cheerTitle')}
            </p>
            <p className="mt-1 text-[11px] text-[rgb(var(--fg-subtle))]">
              {t('home.cheerHint')}
            </p>
          </div>
          <Heart
            className="size-5 flex-shrink-0 text-accent-500"
            aria-hidden
            fill="currentColor"
          />
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {CHEER_EMOJIS.map((emoji) => (
            <CheerButton
              key={emoji}
              emoji={emoji}
              label={cheerLabelKey(emoji, t)}
              onTap={onSend}
              disabled={limitReached}
            />
          ))}
        </div>
      </Card>
      <CheerFloater floaters={floaters} onComplete={removeFloater} />
    </section>
  );
}

function cheerLabelKey(emoji: CheerEmoji, t: (key: string) => string): string {
  switch (emoji) {
    case '💪':
      return t('home.cheerLabelMuscle');
    case '🔥':
      return t('home.cheerLabelFire');
    case '❤️':
      return t('home.cheerLabelHeart');
    case '👏':
      return t('home.cheerLabelClap');
    case '🙌':
      return t('home.cheerLabelHands');
  }
}

/**
 * Filter to entries recorded today (local day). Inline here so the
 * partner-weight hook — which returns plain `WeightRecord[]` — can
 * be passed to the today-card without pulling `withinDays` into
 * another import.
 */
function filterToday<T extends { recordedAt: number }>(
  records: T[],
  at = Date.now(),
): T[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfDay = at - (at % dayMs);
  return records.filter((r) => r.recordedAt >= startOfDay && r.recordedAt < startOfDay + dayMs);
}

/**
 * One-shot toaster for unseen received cheers. Lives at the bottom of
 * the file so it can be a tiny inline component without polluting the
 * top-level export surface.
 */
function ReceivedCheersToaster({ userId }: { userId: string | null }) {
  const { t } = useTranslation();
  const allCheers = useCheerStore((s) => s.cheers);
  const markAllSeen = useCheerStore((s) => s.markAllSeen);
  const currentUser = useCurrentUser();
  const surfacedRef = useRef<Set<string>>(new Set());

  // Compute unseen list and surface the latest one as a toast. Older
  // unseen cheers are silently marked seen so a backlog doesn't fire
  // a stream of toasts on the next visit.
  const unseen = useMemo(() => {
    if (!userId) return [];
    return allCheers
      .filter((c) => c.toUserId === userId && !c.seen)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [userId, allCheers]);

  useEffect(() => {
    if (!userId || unseen.length === 0) return;
    const latest = unseen[0]!;
    if (surfacedRef.current.has(latest.id)) return;
    surfacedRef.current.add(latest.id);
    const fromName = (() => {
      if (!currentUser) return 'Partner';
      if (latest.fromUserId === currentUser.id) {
        return t('couple.partnerCard.you');
      }
      return 'Partner';
    })();
    toast({
      variant: 'info',
      message: t('home.cheerReceived', { name: fromName, emoji: latest.emoji }),
    });
    markAllSeen(userId);
  }, [userId, unseen, currentUser, markAllSeen, t]);

  return null;
}
