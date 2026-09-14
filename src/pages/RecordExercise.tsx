import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ChevronLeft,
  Dumbbell,
  Flame,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { VoiceButton } from '../components/ui/VoiceButton';
import { useCurrentUser } from '../store/auth';
import { latestBefore, useWeightStore } from '../store/weight';
import {
  sortByDateDesc,
  withinDay,
  sumDuration,
  sumCalories,
  minutesByType,
  useExerciseStore,
  type ExerciseRecord,
  type ExerciseType,
  type Intensity,
} from '../store/exercise';
import { toKg } from '../lib/units';
import {
  EXERCISE_TYPE_ORDER,
  estimateCalories,
  parseExerciseFromTranscript,
} from '../lib/exercise';
import { toast } from '../store/toast';
import { cn } from '../lib/utils';
import type { VoiceErrorCode } from '../lib/voice';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DURATION_MIN = 5;
const DURATION_MAX = 300;

/**
 * Body-weight default used when the user has no weight reading yet.
 * 65 kg ≈ 143 lb — sits in the middle of the supported range so the
 * estimate stays plausible until the first weight reading lands.
 */
const FALLBACK_WEIGHT_KG = 65;

/**
 * RecordExercise — PF-5's workout entry flow.
 *
 * Two input modes that share state:
 *   1. Voice (long-press `VoiceButton`) — once we have a transcript, we
 *      run `parseExerciseFromTranscript(...)`. If both type + duration
 *      are recognised we auto-fill the form *and* mark it eligible for
 *      the "happy path" save (the user only taps `Save`). If only one
 *      field is recognised we pre-fill the form and ask the user to
 *      confirm — see `onVoiceResult` below for the explicit rules.
 *   2. Manual — type chip picker, duration `Input`, intensity 3-way
 *      toggle. Calories re-estimate on every change so the user gets
 *      instant feedback as they tweak.
 *
 * BUG-FIX-1 voice-denied UX mirrors `RecordWeight.tsx`: the inline
 * "microphone is blocked" card is raised on `not-allowed`, and the
 * toast only fires once per denial session (handled inside VoiceButton).
 */
export function RecordExercisePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();

  const addRecord = useExerciseStore((s) => s.addRecord);
  const allRecords = useExerciseStore((s) => s.records);
  const weightRecords = useWeightStore((s) => s.records);

  const [type, setType] = useState<ExerciseType | null>(null);
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [micDenied, setMicDenied] = useState(false);

  // Look up the user's most-recent weight in kg for the calorie
  // estimate. Falls back to a reasonable default (and surfaces a one-off
  // hint via the i18n string below) so the page is usable immediately
  // after signup, before any weight reading exists.
  const latestWeight = useMemo(() => latestBefore(weightRecords), [weightRecords]);
  const weightKg = useMemo(() => {
    if (latestWeight) return toKg(latestWeight.weight, latestWeight.unit);
    return FALLBACK_WEIGHT_KG;
  }, [latestWeight]);

  const todayRecords = useMemo(() => withinDay(allRecords), [allRecords]);
  const todayDesc = useMemo(() => sortByDateDesc(todayRecords), [todayRecords]);
  const todayMinutes = useMemo(() => sumDuration(todayRecords), [todayRecords]);
  const todayCalories = useMemo(() => sumCalories(todayRecords), [todayRecords]);
  const todayMix = useMemo(() => minutesByType(todayRecords), [todayRecords]);

  const durationNumber = Number.parseFloat(duration);
  const durationValid =
    Number.isFinite(durationNumber) && durationNumber >= DURATION_MIN && durationNumber <= DURATION_MAX;

  const caloriesEstimate = useMemo(() => {
    if (!type || !durationValid || !intensity) return 0;
    return estimateCalories({ type, durationMin: durationNumber, intensity, weightKg });
  }, [type, durationNumber, durationValid, intensity, weightKg]);

  const readyToSave = type !== null && durationValid && intensity !== null && !error;

  const submit = (via: 'manual' | 'voice') => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!type || !durationValid || !intensity) return;
    addRecord({
      userId: user.id,
      type,
      durationMin: Math.round(durationNumber),
      intensity,
      estimatedCalories: caloriesEstimate,
      source: via,
    });
    setType(null);
    setDuration('');
    setIntensity(null);
    setError(null);
    setCelebrating(true);
    window.setTimeout(() => setCelebrating(false), 1400);
    toast({ variant: 'success', message: t('record.exerciseSavedToast') });
  };

  const onManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) {
      setError(t('record.exerciseTypeRequired'));
      return;
    }
    if (!intensity) {
      setError(t('record.exerciseIntensityRequired'));
      return;
    }
    if (!durationValid) {
      setError(t('record.exerciseInvalidDuration'));
      return;
    }
    submit('manual');
  };

  const onVoiceResult = (transcript: string) => {
    const parsed = parseExerciseFromTranscript(transcript);
    if (parsed.matched && parsed.type && parsed.durationMin !== null) {
      // Happy path — pre-fill the form *and* auto-save. Mirrors the
      // PF-3 weight flow: the user only taps "save" on the explicit
      // happy-path where the parser recognised everything cleanly.
      setType(parsed.type);
      setDuration(String(parsed.durationMin));
      setIntensity((prev) => prev ?? 'medium');
      // Defer the save so React commits the form state first (otherwise
      // the celebrate animation can race the state reset on quick taps).
      window.setTimeout(() => submit('voice'), 60);
      return;
    }
    if (parsed.type) setType(parsed.type);
    if (parsed.durationMin !== null) setDuration(String(parsed.durationMin));
    if (parsed.partial.type || parsed.partial.duration) {
      toast({ variant: 'info', message: t('record.exerciseVoicePartial') });
    } else {
      toast({ variant: 'error', message: t('record.exerciseVoiceEmpty') });
    }
  };

  const onVoiceError = (code: VoiceErrorCode) => {
    const map: Record<VoiceErrorCode, string> = {
      'no-speech': t('record.voiceNoSpeech'),
      'no-match': t('record.exerciseVoiceEmpty'),
      'not-allowed': t('record.voiceDenied'),
      'not-supported': t('record.voiceUnsupported'),
      network: t('record.voiceNetwork'),
      'audio-capture': t('record.voiceDenied'),
      aborted: t('voice.not_understood'),
      unknown: t('voice.not_understood'),
    };
    if (code === 'not-allowed' || code === 'audio-capture') {
      setMicDenied(true);
    }
    toast({ variant: 'error', message: map[code] ?? t('voice.not_understood') });
  };

  const voiceExampleKey = i18n.language.startsWith('zh')
    ? 'record.exerciseVoiceExampleZh'
    : 'record.exerciseVoiceExampleEn';

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t('record.exerciseTitle')}
        subtitle={t('record.exerciseSubtitle')}
        trailing={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="pf-press inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--fg-primary))]"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            {t('common.back')}
          </button>
        }
      />

      <Card raised className={cn('relative overflow-hidden transition-all duration-300', celebrating && 'ring-2 ring-accent-500/40')}>
        {celebrating ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-100/40 via-transparent to-brand-100/40"
          />
        ) : null}
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="flex size-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-brand-500 text-white shadow-md"
            >
              <Dumbbell className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
                {t('record.exerciseTodaySummary')}
              </p>
              <p className="mt-0.5 text-xs text-[rgb(var(--fg-secondary))]">
                {t('record.exerciseTotalDuration', { minutes: todayMinutes })}
                <span className="mx-1 text-[rgb(var(--fg-subtle))]">·</span>
                {t('record.exerciseTotalCalories', { calories: todayCalories })}
              </p>
            </div>
          </div>

          <form onSubmit={onManualSubmit} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-[rgb(var(--fg-primary))]">
                {t('record.exerciseTypeLabel')}
              </legend>
              <div className="flex flex-wrap gap-2">
                {EXERCISE_TYPE_ORDER.map((option) => {
                  const active = option === type;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setType(option);
                        setError(null);
                      }}
                      aria-pressed={active}
                      className={cn(
                        'pf-press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'border-accent-500 bg-accent-500 text-white shadow-sm'
                          : 'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] text-[rgb(var(--fg-primary))] hover:bg-[rgb(var(--bg-sunken))]',
                      )}
                    >
                      <span aria-hidden>{iconFor(option)}</span>
                      {t(`record.types.${option}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Input
              label={t('record.exerciseDurationLabel')}
              type="number"
              inputMode="numeric"
              step="1"
              min={DURATION_MIN}
              max={DURATION_MAX}
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value);
                setError(null);
              }}
              placeholder={t('record.exerciseDurationPlaceholder')}
              hint={t('record.exerciseDurationHint')}
              trailingIcon={<span className="text-xs font-medium text-[rgb(var(--fg-secondary))]">min</span>}
              error={error ?? undefined}
            />

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-[rgb(var(--fg-primary))]">
                {t('record.exerciseIntensityLabel')}
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((option) => {
                  const active = option === intensity;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setIntensity(option);
                        setError(null);
                      }}
                      aria-pressed={active}
                      className={cn(
                        'pf-press inline-flex flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                        active
                          ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                          : 'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] text-[rgb(var(--fg-primary))] hover:bg-[rgb(var(--bg-sunken))]',
                      )}
                    >
                      <span aria-hidden>{intensityGlyph(option)}</span>
                      <span>{t(`record.intensity.${option}`)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <CaloriePreview
              kcal={caloriesEstimate}
              visible={readyToSave}
              weightKg={weightKg}
              intensity={intensity}
              hasWeight={Boolean(latestWeight)}
            />

            <Button
              type="submit"
              variant="accent"
              size="lg"
              block
              disabled={!readyToSave}
              leadingIcon={<Sparkles className="size-4" aria-hidden />}
            >
              {t('record.saveAction')}
            </Button>
          </form>

          <div className="my-1 flex w-full items-center gap-3 text-xs uppercase tracking-wide text-[rgb(var(--fg-subtle))]">
            <div className="h-px flex-1 bg-[rgb(var(--border-default))]" />
            <span>{t('common.optional')}</span>
            <div className="h-px flex-1 bg-[rgb(var(--border-default))]" />
          </div>

          <div className="flex flex-col items-center gap-2">
            <VoiceButton type="exercise" onResult={onVoiceResult} onError={onVoiceError} />
            <p className="text-xs text-[rgb(var(--fg-secondary))]">{t('voice.press_to_speak')}</p>
            <p className="max-w-[18rem] text-center text-[11px] leading-relaxed text-[rgb(var(--fg-subtle))]">
              {t(voiceExampleKey)}
            </p>
          </div>

          {micDenied ? (
            <div
              role="status"
              className="mt-2 flex w-full items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-[rgb(var(--fg-primary))] dark:bg-warning/15"
            >
              <AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-warning" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t('record.voiceDeniedHintTitle')}</p>
                <p className="mt-0.5 leading-relaxed text-[rgb(var(--fg-secondary))]">
                  {t('record.voiceDeniedHintBody')}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-[rgb(var(--fg-subtle))]">
                  {t('record.voiceSettingsTip')}
                </p>
              </div>
            </div>
          ) : null}

          {!latestWeight ? (
            <p className="text-center text-[10px] text-[rgb(var(--fg-subtle))]">
              {t('record.exerciseWeightMissing')}
            </p>
          ) : null}
        </div>
      </Card>

      <section className="mt-6">
        <h2 className="pf-section-title mb-3">{t('record.exerciseDistributionTitle')}</h2>
        {todayMix.length === 0 ? (
          <EmptyState
            emoji="📊"
            title={t('record.exerciseDistributionEmpty')}
          />
        ) : (
          <Card noPadding>
            <ul className="divide-y divide-[rgb(var(--border-default))]">
              {todayMix.map((row) => {
                const share = todayMinutes === 0 ? 0 : row.minutes / todayMinutes;
                const percent = Math.round(share * 100);
                return (
                  <li
                    key={row.type}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div
                      aria-hidden
                      className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-100 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300"
                    >
                      {iconFor(row.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
                        {t(`exercise.typeLabels.${row.type}`)}
                      </p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--bg-sunken))]">
                        <div
                          aria-hidden
                          className="h-full rounded-full bg-accent-500"
                          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end text-xs">
                      <span className="font-semibold text-[rgb(var(--fg-primary))]">
                        {t('record.exerciseDistributionMinutes', { minutes: row.minutes })}
                      </span>
                      <span className="text-[rgb(var(--fg-subtle))]">
                        {t('record.exerciseDistributionShare', { percent })}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <section className="mt-6">
        <h2 className="pf-section-title mb-3">{t('record.exerciseHistoryTitle')}</h2>
        {todayDesc.length === 0 ? (
          <EmptyState
            emoji="🏃"
            title={t('record.exerciseHistoryEmpty')}
            description={t('record.exerciseDistributionEmpty')}
          />
        ) : (
          <Card noPadding>
            <ul className="divide-y divide-[rgb(var(--border-default))]">
              {todayDesc.map((r) => (
                <HistoryRow key={r.id} record={r} />
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ record }: { record: ExerciseRecord }) {
  const { t } = useTranslation();
  const time = useMemo(() => relativeTime(record.recordedAt, t), [record.recordedAt, t]);
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div
        aria-hidden
        className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-100 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300"
      >
        {iconFor(record.type)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
          {t('exercise.entry', {
            duration: record.durationMin,
            typeLabel: t(`exercise.typeLabels.${record.type}`),
          })}
        </p>
        <p className="text-xs text-[rgb(var(--fg-secondary))]">
          {time} · {t(`exercise.source_${record.source}`)} · {t('exercise.calories', { value: record.estimatedCalories })}
        </p>
      </div>
    </li>
  );
}

type Translator = (key: string, options?: Record<string, unknown>) => string;

function relativeTime(ts: number, t: Translator): string {
  const delta = Date.now() - ts;
  if (delta < MS_PER_DAY) return t('exercise.timeToday');
  if (delta < 2 * MS_PER_DAY) return t('exercise.timeYesterday');
  const days = Math.floor(delta / MS_PER_DAY);
  if (days < 7) return t('exercise.timeDaysAgo', { count: days });
  if (days < 30) return t('exercise.timeWeeksAgo', { count: Math.floor(days / 7) });
  return new Date(ts).toLocaleDateString();
}

/**
 * Live calorie-estimate pill. Lives below the manual inputs so the user
 * sees the formula respond to their type / duration / intensity changes.
 * Hidden until the form is `readyToSave` so we don't render a stale
 * "0 kcal" badge before the user has filled anything in.
 */
function CaloriePreview({
  kcal,
  visible,
  weightKg,
  intensity,
  hasWeight,
}: {
  kcal: number;
  visible: boolean;
  weightKg: number;
  intensity: Intensity | null;
  hasWeight: boolean;
}) {
  const { t } = useTranslation();
  if (!visible || kcal <= 0) {
    return (
      <div
        aria-hidden
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[rgb(var(--border-default))] bg-[rgb(var(--bg-sunken))]/60 px-3 py-2 text-xs text-[rgb(var(--fg-subtle))]"
      >
        <Flame className="size-3.5" aria-hidden />
        <span>{t('record.exerciseEstimate', { calories: 0 })}</span>
      </div>
    );
  }
  const intensityLabel = intensity ? t(`record.intensity.${intensity}`) : '—';
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-accent-200 bg-accent-50/70 px-3 py-2 text-xs text-accent-700 dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-100">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Flame className="size-3.5" aria-hidden />
          {t('record.exerciseEstimate', { calories: kcal })}
        </span>
        <span className="font-medium">{intensityLabel}</span>
      </div>
      <p className="text-[10px] leading-relaxed text-[rgb(var(--fg-secondary))]">
        {t('record.exerciseEstimateHint', { weight: weightKg.toFixed(1), intensity: intensityLabel })}
        {!hasWeight ? ` · ${t('record.exerciseWeightMissing')}` : ''}
      </p>
    </div>
  );
}

/**
 * Tiny emoji-glyph map for the type chips. Keeps the picker visually
 * scannable without pulling in another icon set.
 */
function iconFor(type: ExerciseType): string {
  switch (type) {
    case 'running':
      return '🏃';
    case 'cycling':
      return '🚴';
    case 'swimming':
      return '🏊';
    case 'strength':
      return '🏋️';
    case 'yoga':
      return '🧘';
    case 'elliptical':
      return '🌀';
    case 'rope':
      return '⏺️';
    case 'pilates':
      return '🤸';
    case 'other':
    default:
      return '💪';
  }
}

function intensityGlyph(level: Intensity): string {
  if (level === 'low') return '·';
  if (level === 'medium') return '••';
  return '•••';
}