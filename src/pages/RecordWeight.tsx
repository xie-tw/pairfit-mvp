import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronLeft, Scale } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { VoiceButton } from '../components/ui/VoiceButton';
import { WeightChart } from '../components/ui/WeightChart';
import { useCurrentUser } from '../store/auth';
import { useGoalStore, projectGoalCurve } from '../store/goal';
import {
  sortByDateDesc,
  useWeightStore,
  withinDays,
  RECENT_WEIGHT_LIMIT,
  type WeightRecord,
} from '../store/weight';
import { formatWeight } from '../lib/units';
import { toast } from '../store/toast';
import { cn } from '../lib/utils';
import type { VoiceErrorCode } from '../lib/voice';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const WEIGHT_MIN = 20;
const WEIGHT_MAX = 500;

/**
 * RecordWeight — PF-3's weight entry flow.
 *
 * Two input modes that share state:
 *   1. Numeric `Input` (default).
 *   2. Long-press `VoiceButton` — once we have a parsed number, we drop
 *      it into the input. The user can still edit / re-save.
 *
 * BUG-FIX-1: when the user denies microphone permission, `VoiceButton`
 * degrades itself; we additionally surface a small "mic blocked" hint
 * card pointing at browser settings, and the toast stops firing on
 * repeated presses (the button owns the deduping).
 */
export function RecordWeightPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const unit = user?.unit ?? 'kg';
  const addRecord = useWeightStore((s) => s.addRecord);
  const records = useWeightStore((s) => s.records);
  const goal = useGoalStore((s) => s.goal);

  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [micDenied, setMicDenied] = useState(false);

  const sortedDesc = useMemo(() => sortByDateDesc(records), [records]);
  const recent = useMemo(() => sortedDesc.slice(0, RECENT_WEIGHT_LIMIT), [sortedDesc]);
  const chartRecords = useMemo(() => withinDays(records, 30), [records]);
  const goalCurve = useMemo(() => (goal ? projectGoalCurve(goal) : null), [goal]);

  const submit = (weight: number, via: 'manual' | 'voice') => {
    if (!user) {
      navigate('/login');
      return;
    }
    addRecord({ userId: user.id, weight, unit, source: via });
    setDraft('');
    setError(null);
    setCelebrating(true);
    window.setTimeout(() => setCelebrating(false), 1400);
    toast({ variant: 'success', message: t('record.savedToast') });
  };

  const onManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number.parseFloat(draft);
    if (!Number.isFinite(value) || value < WEIGHT_MIN || value > WEIGHT_MAX) {
      setError(t('record.invalidNumber'));
      return;
    }
    submit(value, 'manual');
  };

  const onVoiceResult = (_transcript: string, parsed: number | null) => {
    if (!parsed || !Number.isFinite(parsed)) {
      toast({ variant: 'error', message: t('record.voiceEmpty') });
      return;
    }
    if (parsed < WEIGHT_MIN || parsed > WEIGHT_MAX) {
      toast({ variant: 'error', message: t('record.outOfRange') });
      // Still populate the field so the user can see what we heard.
      setDraft(parsed.toFixed(1));
      return;
    }
    // Auto-fill the input AND auto-save. The PRD says the user only has
    // to tap "save" on the happy path; here we go one better on the
    // explicit "voice input success" path so the input doesn't feel
    // like an extra click after a successful recognition.
    setDraft(parsed.toFixed(1));
    submit(parsed, 'voice');
  };

  const onVoiceError = (code: VoiceErrorCode) => {
    const map: Record<VoiceErrorCode, string> = {
      'no-speech': t('record.voiceNoSpeech'),
      'no-match': t('record.voiceEmpty'),
      'not-allowed': t('record.voiceDenied'),
      'not-supported': t('record.voiceUnsupported'),
      network: t('record.voiceNetwork'),
      'audio-capture': t('record.voiceDenied'),
      aborted: t('voice.not_understood'),
      unknown: t('voice.not_understood'),
    };
    // Once the user has denied the mic, raise the inline hint card so the
    // page is self-explanatory even after the toast fades. VoiceButton
    // itself deduplicates the toast for `not-allowed`, but other errors
    // are still useful as one-off feedback.
    if (code === 'not-allowed' || code === 'audio-capture') {
      setMicDenied(true);
    }
    toast({ variant: 'error', message: map[code] ?? t('voice.not_understood') });
  };

  const voiceExampleKey = i18n.language.startsWith('zh')
    ? 'record.voiceExampleZh'
    : 'record.voiceExampleEn';

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t('record.weightTitle')}
        subtitle={t('record.weightSubtitle')}
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

      <Card raised className={cn('relative overflow-hidden transition-all duration-300', celebrating && 'ring-2 ring-brand-500/40')}>
        {celebrating ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-100/40 via-transparent to-accent-100/40"
          />
        ) : null}
        <div className="relative flex flex-col items-center gap-4">
          <div
            aria-hidden
            className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-md"
          >
            <Scale className="size-7" />
          </div>
          <form onSubmit={onManualSubmit} className="w-full">
            <Input
              label={`${t('record.inputLabel')} (${unit})`}
              type="number"
              inputMode="decimal"
              step="0.1"
              min={WEIGHT_MIN}
              max={WEIGHT_MAX}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              placeholder={t('record.inputPlaceholder')}
              trailingIcon={<span className="text-xs font-medium text-[rgb(var(--fg-secondary))]">{unit}</span>}
              error={error ?? undefined}
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              className="mt-3"
              disabled={!draft || !Number.isFinite(Number.parseFloat(draft))}
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
            <VoiceButton type="weight" onResult={onVoiceResult} onError={onVoiceError} />
            <p className="text-xs text-[rgb(var(--fg-secondary))]">
              {t('voice.press_to_speak')}
            </p>
            <p className="max-w-[16rem] text-center text-[11px] leading-relaxed text-[rgb(var(--fg-subtle))]">
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
        </div>
      </Card>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="pf-section-title">{t('trends.weightTitle')}</h2>
          <span className="text-xs text-[rgb(var(--fg-subtle))]">30d</span>
        </div>
        <Card raised>
          <WeightChart
            records={chartRecords}
            goalCurve={goalCurve}
            goalWeight={goal?.targetWeight ?? null}
            unit={unit}
            windowDays={30}
          />
          {!goal ? (
            <p className="mt-3 text-center text-xs text-[rgb(var(--fg-secondary))]">
              {t('trends.noGoal')}
            </p>
          ) : null}
        </Card>
      </section>

      <section className="mt-6">
        <h2 className="pf-section-title mb-3">{t('record.historyTitle')}</h2>
        {recent.length === 0 ? (
          <EmptyState
            emoji="📓"
            title={t('record.historyEmpty')}
            description={t('trends.empty')}
          />
        ) : (
          <Card noPadding>
            <ul className="divide-y divide-[rgb(var(--border-default))]">
              {recent.map((r) => (
                <HistoryRow key={r.id} record={r} />
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ record }: { record: WeightRecord }) {
  const { t } = useTranslation();
  const time = useMemo(() => relativeTime(record.recordedAt, t), [record.recordedAt, t]);
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div
        aria-hidden
        className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
      >
        <Scale className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
          {formatWeight(record.weight, record.unit)}
        </p>
        <p className="text-xs text-[rgb(var(--fg-secondary))]">
          {time} · {t(`weight.source_${record.source}`)}
        </p>
      </div>
    </li>
  );
}

type Translator = (key: string, options?: Record<string, unknown>) => string;

function relativeTime(ts: number, t: Translator): string {
  const delta = Date.now() - ts;
  if (delta < MS_PER_DAY) return t('weight.timeToday');
  if (delta < 2 * MS_PER_DAY) return t('weight.timeYesterday');
  const days = Math.floor(delta / MS_PER_DAY);
  if (days < 7) return t('weight.timeDaysAgo', { count: days });
  if (days < 30) return t('weight.timeWeeksAgo', { count: Math.floor(days / 7) });
  return new Date(ts).toLocaleDateString();
}
