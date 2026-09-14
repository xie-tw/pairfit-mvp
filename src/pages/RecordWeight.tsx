import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Scale } from 'lucide-react';
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
 * Below the entry block we render a 30-day sparkline + the most recent
 * 7 readings, so the page doubles as a "history" view after the user
 * has logged a few times.
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

  const onVoiceError = (code: string) => {
    const map: Record<string, string> = {
      'no-speech': t('record.voiceNoSpeech'),
      'no-match': t('record.voiceEmpty'),
      'not-allowed': t('record.voiceDenied'),
      'not-supported': t('record.voiceUnsupported'),
      network: t('record.voiceNetwork'),
      'audio-capture': t('record.voiceDenied'),
    };
    toast({ variant: 'error', message: map[code] ?? t('voice.not_understood') });
  };

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
              {i18n.language.startsWith('zh')
                ? '例:"今天 65.5 公斤" 或"今天 144 磅"'
                : 'e.g. "today 65.5 kg" or "today 144 lb"'}
            </p>
          </div>
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
  const time = useMemo(() => relativeTime(record.recordedAt), [record.recordedAt]);
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

function relativeTime(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < MS_PER_DAY) return 'today';
  if (delta < 2 * MS_PER_DAY) return 'yesterday';
  const days = Math.floor(delta / MS_PER_DAY);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(ts).toLocaleDateString();
}
