import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Calendar,
  ChevronRight,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { useCurrentUser } from '../store/auth';
import {
  useGoalStore,
  type GoalDirection,
  type WeeklyRate,
  WEEKLY_RATE_PRESETS,
  projectGoalCurve,
} from '../store/goal';
import { useWeightStore, sortByDateDesc } from '../store/weight';
import { formatWeight } from '../lib/units';
import { WeightChart } from '../components/ui/WeightChart';
import { cn } from '../lib/utils';

const TOTAL_STEPS = 3;
const MIN_DELTA = 1; // 1 unit (kg or lb)
const WEIGHT_MIN = 20;
const WEIGHT_MAX = 500;

type Step = 1 | 2 | 3 | 4;

/**
 * Onboarding — the post-signup flow that lands in PF-3.
 *
 * Three steps then a celebration overlay:
 *   1. Direction (lose / gain)
 *   2. Weights (start + target) + weekly rate
 *   3. Preview (curve + estimated date)
 *   4. Confetti state with a "start logging" CTA
 *
 * Reuses existing UI primitives (Card / Button / Input / PageHeader) and
 * the design tokens. We don't drag in any animation libs — CSS transitions
 * on the chart and a slide-fade on the step body are enough.
 */
export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const unit = user?.unit ?? 'kg';
  const setGoal = useGoalStore((s) => s.setGoal);
  const updateGoal = useGoalStore((s) => s.updateGoal);
  const goal = useGoalStore((s) => s.goal);
  const records = useWeightStore((s) => s.records);

  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<GoalDirection>(goal?.direction ?? 'lose');
  const [startWeight, setStartWeight] = useState<string>(
    goal?.startWeight ? String(goal.startWeight) : '',
  );
  const [targetWeight, setTargetWeight] = useState<string>(
    goal?.targetWeight ? String(goal.targetWeight) : '',
  );
  const [weeklyRate, setWeeklyRate] = useState<WeeklyRate>(goal?.weeklyRate ?? -0.5);
  const [error, setError] = useState<string | null>(null);
  // Confirm dialog: shown before the user bails out mid-flow. We use a
  // single state flag (`confirmingExit`) rather than a Modal ref so the
  // confirm lives in the same render tree as the page it gates.
  const [confirmingExit, setConfirmingExit] = useState(false);

  // "Now" is captured once per mount so subsequent re-renders don't drift.
  // Lint picks this up as the only pure-source for "current time" reads in
  // the component body; downstream `previewGoal` derives from it.
  const [now] = useState(() => Date.now());

  // Keyboard shortcuts — Esc cancels (with confirm), ← goes back one step,
  // → advances one step. We deliberately skip the arrow keys when the
  // user is typing into an `<input>` so they can still nudge a cursor
  // around inside the weights form. The browser already handles the
  // native "← = back in history" gesture on a global level, so we only
  // capture it when the event target is the body / a non-form element.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmingExit) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelExit();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        requestExit();
        return;
      }
      const target = e.target as HTMLElement | null;
      const inForm =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (inForm) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'ArrowRight') {
        if (step < 3) {
          e.preventDefault();
          advance();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, confirmingExit]);

  // Filter weekly-rate options to match the user's direction. The PRD
  // locks these six presets, but showing +0.3 / +0.5 to a "lose" user
  // would be confusing — they're only "right" for the opposite direction.
  const filteredRates = useMemo<WeeklyRate[]>(
    () => WEEKLY_RATE_PRESETS.filter((r) => (direction === 'lose' ? r < 0 : r > 0)),
    [direction],
  );

  // Keep `weeklyRate` in sync if the user flips direction mid-flow.
  const handleDirection = (next: GoalDirection) => {
    setDirection(next);
    const nextRates = WEEKLY_RATE_PRESETS.filter((r) => (next === 'lose' ? r < 0 : r > 0));
    const currentSignMatch = (next === 'lose' ? weeklyRate < 0 : weeklyRate > 0);
    if (!currentSignMatch && nextRates.length > 0) {
      setWeeklyRate(nextRates[0]!);
    }
  };

  const parsedStart = Number.parseFloat(startWeight);
  const parsedTarget = Number.parseFloat(targetWeight);
  const numericValid =
    Number.isFinite(parsedStart) && parsedStart >= WEIGHT_MIN && parsedStart <= WEIGHT_MAX &&
    Number.isFinite(parsedTarget) && parsedTarget >= WEIGHT_MIN && parsedTarget <= WEIGHT_MAX;
  const directionValid =
    numericValid &&
    (direction === 'lose' ? parsedStart - parsedTarget >= MIN_DELTA : parsedTarget - parsedStart >= MIN_DELTA);

  const previewGoal = numericValid
    ? {
        direction,
        startWeight: parsedStart,
        targetWeight: parsedTarget,
        weeklyRate,
        unit,
        startDate: now,
        targetDate: now + Math.abs((parsedTarget - parsedStart) / weeklyRate) * 7 * 24 * 60 * 60 * 1000,
      }
    : null;

  const advance = () => {
    setError(null);
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!numericValid) {
        setError(t('onboarding.validation.outOfRange', { unit }));
        return;
      }
      if (!directionValid) {
        setError(
          direction === 'lose'
            ? t('onboarding.validation.loseDirection', { unit })
            : t('onboarding.validation.gainDirection', { unit }),
        );
        return;
      }
      // Persist a draft goal so the preview has something to plot, even
      // if the user abandons halfway through. The "lock it in" button at
      // step 3 is the real commit.
      if (goal) {
        updateGoal({
          direction,
          startWeight: parsedStart,
          targetWeight: parsedTarget,
          weeklyRate,
          unit,
        });
      } else {
        setGoal({
          direction,
          startWeight: parsedStart,
          targetWeight: parsedTarget,
          weeklyRate,
          unit,
          startDate: now,
        });
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
  };

  const goBack = () => {
    setError(null);
    if (step === 1) {
      // Step 1 has no previous step — surface the same exit confirm as
      // the X button so the user always sees one cancellation path.
      requestExit();
      return;
    }
    setStep((s) => (s === 4 ? 3 : ((s - 1) as Step)));
  };

  // Cancel destination — `/me` is always reachable for signed-in users
  // (and visible even when signed out per `IA.md`). Home is the
  // alternate so we fall back there when the user has no session yet.
  const exitPath = user ? '/me' : '/';

  const requestExit = () => setConfirmingExit(true);
  const cancelExit = () => setConfirmingExit(false);
  const confirmExit = () => {
    setConfirmingExit(false);
    navigate(exitPath);
  };

  const onComplete = () => {
    navigate('/', { replace: true });
  };

  const chartCurve = previewGoal ? projectGoalCurve(previewGoal) : null;
  const recent = sortByDateDesc(records).slice(0, 7);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={user ? t('onboarding.directionTitle', { name: user.displayName }) : t('onboarding.directionTitle')}
        subtitle={user ? undefined : t('onboarding.directionSubtitle')}
        trailing={
          step < 4 ? (
            <button
              type="button"
              onClick={requestExit}
              aria-label={t('onboarding.cancelCta')}
              title={t('onboarding.exitDestHint')}
              className="inline-flex size-9 items-center justify-center rounded-full text-[rgb(var(--fg-secondary))] transition-colors hover:bg-[rgb(var(--bg-sunken))] hover:text-[rgb(var(--fg-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg-app))]"
            >
              <X className="size-5" aria-hidden />
            </button>
          ) : null
        }
      />

      {/* Step indicator — only render for steps 1–3. */}
      {step < 4 ? (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-[rgb(var(--fg-secondary))]">
            <span>{t('onboarding.stepLabel', { step, total: TOTAL_STEPS })}</span>
            <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--bg-sunken))]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-300 ease-out-quart"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      <div key={step} className="animate-slide-up">
        {step === 1 ? (
          <DirectionStep value={direction} onChange={handleDirection} />
        ) : null}

        {step === 2 ? (
          <WeightsStep
            unit={unit}
            direction={direction}
            startWeight={startWeight}
            targetWeight={targetWeight}
            weeklyRate={weeklyRate}
            filteredRates={filteredRates}
            onStartWeight={setStartWeight}
            onTargetWeight={setTargetWeight}
            onWeeklyRate={setWeeklyRate}
            error={error}
          />
        ) : null}

        {step === 3 && previewGoal ? (
          <PreviewStep
            unit={unit}
            startWeight={previewGoal.startWeight}
            targetWeight={previewGoal.targetWeight}
            weeklyRate={previewGoal.weeklyRate}
            targetDate={previewGoal.targetDate}
            goalCurve={chartCurve}
            recentCount={recent.length}
          />
        ) : null}

        {step === 4 ? (
          <CelebrateStep onComplete={onComplete} />
        ) : null}
      </div>

      {step < 4 ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          {/* Step 1 has no in-flow "previous" — surface the exit confirm
              instead. Steps 2 & 3 step back within the flow. */}
          <Button
            variant="ghost"
            size="md"
            onClick={goBack}
            leadingIcon={
              step === 1 ? (
                <ArrowLeft className="size-4" aria-hidden />
              ) : (
                <ArrowRight className="size-4 rotate-180" aria-hidden />
              )
            }
          >
            {step === 1 ? t('onboarding.backCta') : t('onboarding.previousStepCta')}
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={advance}
            trailingIcon={<ChevronRight className="size-4" aria-hidden />}
            disabled={step === 2 && (!numericValid || !directionValid)}
          >
            {step === 3 ? t('onboarding.completeCta') : t('common.continue')}
          </Button>
        </div>
      ) : null}

      {confirmingExit ? (
        <ExitConfirmDialog
          onCancel={cancelExit}
          onConfirm={confirmExit}
        />
      ) : null}
    </div>
  );
}



function DirectionStep({
  value,
  onChange,
}: {
  value: GoalDirection;
  onChange: (next: GoalDirection) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-[rgb(var(--fg-primary))]">
        {t('onboarding.directionTitle')}
      </h2>
      <p className="text-sm text-[rgb(var(--fg-secondary))]">
        {t('onboarding.directionSubtitle')}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DirectionCard
          selected={value === 'lose'}
          onSelect={() => onChange('lose')}
          icon={<TrendingDown className="size-6" aria-hidden />}
          accent="brand"
          title={t('onboarding.loseTitle')}
          body={t('onboarding.loseBody')}
          preview={t('onboarding.losePreview', { value: '0.5', unit: 'kg' })}
        />
        <DirectionCard
          selected={value === 'gain'}
          onSelect={() => onChange('gain')}
          icon={<TrendingUp className="size-6" aria-hidden />}
          accent="accent"
          title={t('onboarding.gainTitle')}
          body={t('onboarding.gainBody')}
          preview={t('onboarding.gainPreview', { value: '0.3', unit: 'kg' })}
        />
      </div>
    </div>
  );
}

function DirectionCard({
  selected,
  onSelect,
  icon,
  title,
  body,
  preview,
  accent,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
  preview: string;
  accent: 'brand' | 'accent';
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all duration-200 ease-out-quart pf-press',
        selected
          ? accent === 'brand'
            ? 'border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-500/30 dark:bg-brand-500/10'
            : 'border-accent-500 bg-accent-50 shadow-md ring-2 ring-accent-500/30 dark:bg-accent-500/10'
          : 'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] hover:border-[rgb(var(--border-strong))]',
      )}
    >
      <div
        aria-hidden
        className={cn(
          'flex size-12 items-center justify-center rounded-xl text-white',
          accent === 'brand' ? 'bg-brand-500' : 'bg-accent-500',
        )}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-[rgb(var(--fg-primary))]">{title}</h3>
        <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">{body}</p>
      </div>
      <span
        className={cn(
          'pf-chip',
          accent === 'brand'
            ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
            : 'bg-accent-100 text-accent-700 dark:bg-accent-500/15 dark:text-accent-200',
        )}
      >
        {preview}
      </span>
    </button>
  );
}

function WeightsStep({
  unit,
  direction,
  startWeight,
  targetWeight,
  weeklyRate,
  filteredRates,
  onStartWeight,
  onTargetWeight,
  onWeeklyRate,
  error,
}: {
  unit: 'kg' | 'lb';
  direction: GoalDirection;
  startWeight: string;
  targetWeight: string;
  weeklyRate: WeeklyRate;
  filteredRates: WeeklyRate[];
  onStartWeight: (v: string) => void;
  onTargetWeight: (v: string) => void;
  onWeeklyRate: (v: WeeklyRate) => void;
  error: string | null;
}) {
  const { t } = useTranslation();
  const ArrowIcon = direction === 'lose' ? ArrowDown : ArrowUp;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[rgb(var(--fg-primary))]">
          {t('onboarding.weightsTitle')}
        </h2>
        <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
          {t('onboarding.weightsSubtitle')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t('onboarding.startWeight')}
          type="number"
          inputMode="decimal"
          step="0.1"
          min={WEIGHT_MIN}
          max={WEIGHT_MAX}
          value={startWeight}
          onChange={(e) => onStartWeight(e.target.value)}
          placeholder={t('record.inputPlaceholder')}
          trailingIcon={<span className="text-xs font-medium text-[rgb(var(--fg-secondary))]">{unit}</span>}
          required
        />
        <Input
          label={t('onboarding.targetWeight')}
          type="number"
          inputMode="decimal"
          step="0.1"
          min={WEIGHT_MIN}
          max={WEIGHT_MAX}
          value={targetWeight}
          onChange={(e) => onTargetWeight(e.target.value)}
          placeholder={t('record.inputPlaceholder')}
          trailingIcon={
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[rgb(var(--fg-secondary))]">
              {unit}
              <ArrowIcon size={12} aria-hidden className="ml-0.5" />
            </span>
          }
          required
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[rgb(var(--fg-primary))]">
          {t('onboarding.weeklyRate')}
        </p>
        <div className="flex flex-wrap gap-2">
          {filteredRates.map((rate) => {
            const isSelected = rate === weeklyRate;
            return (
              <button
                key={rate}
                type="button"
                onClick={() => onWeeklyRate(rate)}
                aria-pressed={isSelected}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out-quart pf-press',
                  isSelected
                    ? direction === 'lose'
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                      : 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-200'
                    : 'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] text-[rgb(var(--fg-secondary))] hover:border-[rgb(var(--border-strong))]',
                )}
              >
                {direction === 'lose' ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUp className="size-3.5" aria-hidden />}
                {t('onboarding.weeklyPaceValue', { value: Math.abs(rate).toFixed(rate % 1 === 0 ? 0 : 2), unit })}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger dark:bg-danger/15"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

function PreviewStep({
  unit,
  startWeight,
  targetWeight,
  weeklyRate,
  targetDate,
  goalCurve,
  recentCount,
}: {
  unit: 'kg' | 'lb';
  startWeight: number;
  targetWeight: number;
  weeklyRate: WeeklyRate;
  targetDate: number;
  goalCurve: import('../store/goal').CurvePoint[];
  recentCount: number;
}) {
  const { t, i18n } = useTranslation();
  const dateLabel = useMemo(() => formatDate(targetDate, i18n.language), [targetDate, i18n.language]);
  const totalDelta = targetWeight - startWeight;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[rgb(var(--fg-primary))]">
          {t('onboarding.previewTitle')}
        </h2>
        <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
          {t('onboarding.previewSubtitle')}
        </p>
      </div>

      <Card raised>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label={t('onboarding.startWeight')} value={`${startWeight.toFixed(1)} ${unit}`} />
          <Stat
            label={t('onboarding.targetWeight')}
            value={`${targetWeight.toFixed(1)} ${unit}`}
            accent={totalDelta < 0 ? 'brand' : 'accent'}
          />
          <Stat
            label={t('onboarding.weeklyRate')}
            value={t('onboarding.weeklyPaceValue', {
              value: Math.abs(weeklyRate).toFixed(weeklyRate % 1 === 0 ? 0 : 2),
              unit,
            })}
          />
        </div>

        <div className="mt-4 rounded-xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-app))] p-3">
          <WeightChart
            records={[]}
            goalCurve={goalCurve}
            goalWeight={targetWeight}
            unit={unit}
            windowDays={Math.min(90, Math.max(7, Math.round((targetDate - Date.now()) / (24 * 60 * 60 * 1000))))}
            hideGoal={false}
          />
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[rgb(var(--bg-sunken))] px-3 py-2 text-sm">
          <Calendar className="size-4 text-brand-500" aria-hidden />
          <span className="text-[rgb(var(--fg-secondary))]">{t('onboarding.targetDateLabel')}:</span>
          <span className="font-semibold text-[rgb(var(--fg-primary))]">{dateLabel}</span>
        </div>
      </Card>

      {recentCount > 0 ? (
        <div className="text-xs text-[rgb(var(--fg-secondary))]">
          ✓ {t('weight.ago', { time: t('common.reading', { count: recentCount }) })}
        </div>
      ) : (
        <EmptyState
          emoji="📈"
          title={t('onboarding.celebrateBody')}
          description={t('trends.noGoal')}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'brand' | 'accent' }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
        {label}
      </span>
      <span
        className={cn(
          'text-base font-bold tabular-nums',
          accent === 'brand' && 'text-brand-600 dark:text-brand-300',
          accent === 'accent' && 'text-accent-600 dark:text-accent-300',
          !accent && 'text-[rgb(var(--fg-primary))]',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function CelebrateStep({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  return (
    <Card raised className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-brand-100/70 blur-2xl dark:bg-brand-500/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-12 size-48 rounded-full bg-accent-100/70 blur-2xl dark:bg-accent-500/15"
      />
      <div className="relative flex flex-col items-center gap-4 py-8 text-center">
        <div
          aria-hidden
          className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg"
        >
          <Target className="size-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[rgb(var(--fg-primary))]">
            {t('onboarding.celebrateTitle')}
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
            {t('onboarding.celebrateBody')}
          </p>
        </div>
        <span className="pf-chip">
          <Sparkles className="size-3.5 text-brand-500" aria-hidden />
          {formatWeight(0, 'kg').replace(/[0-9.]+\s/, '')}
        </span>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" size="lg" onClick={onComplete}>
            {t('onboarding.startLogging')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Locale-aware date formatter for the estimated target date. Uses the
 * browser's Intl.DateTimeFormat with the user's current locale, falling
 * back to ISO if Intl is unavailable.
 */
function formatDate(ts: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(localeToTag(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

function localeToTag(locale: string): string {
  if (locale.toLowerCase().startsWith('zh')) return 'zh-CN';
  return 'en-US';
}

/**
 * ExitConfirmDialog — minimal in-place confirm modal used by the
 * Onboarding flow before the user bails out. Lives next to the page it
 * gates because it has no other consumers yet; once another multi-step
 * flow (PF-4 food, PF-6 couple bind, …) needs the same pattern, lift it
 * into `components/ui/ConfirmDialog.tsx`. The global rule for those
 * future flows is documented in `docs/design-handoff/flows-and-navigation.md`.
 *
 * Kept dependency-free: a backdrop, a centered card, two buttons. No
 * focus-trap or portal — the page is full-screen so there's nowhere
 * else for focus to go, and Esc is already handled at the page level.
 */
function ExitConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-exit-title"
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 pt-12 sm:items-center sm:p-6"
    >
      <button
        type="button"
        aria-label={t('onboarding.exitConfirm.keepEditing')}
        onClick={onCancel}
        className="absolute inset-0 bg-[rgb(var(--bg-app))]/70 backdrop-blur-sm"
      />
      <Card
        raised
        className="relative w-full max-w-sm animate-slide-up"
      >
        <h2
          id="onboarding-exit-title"
          className="text-base font-semibold text-[rgb(var(--fg-primary))]"
        >
          {t('onboarding.exitConfirm.title')}
        </h2>
        <p className="mt-1.5 text-sm text-[rgb(var(--fg-secondary))]">
          {t('onboarding.exitConfirm.body')}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="md" onClick={onCancel}>
            {t('onboarding.exitConfirm.keepEditing')}
          </Button>
          <Button variant="danger" size="md" onClick={onConfirm}>
            {t('onboarding.exitConfirm.confirmExit')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
