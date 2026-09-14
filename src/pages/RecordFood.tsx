import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ChevronLeft,
  Keyboard,
  Loader2,
  Mic,
  RefreshCw,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { ItemEditor } from '../components/ui/ItemEditor';
import { MealCard } from '../components/ui/MealCard';
import { PageHeader } from '../components/ui/PageHeader';
import { VoiceButton } from '../components/ui/VoiceButton';
import {
  classifyMealSlot,
  groupByMealSlot,
  sortByDateDesc,
  sumCalories,
  useFoodStore,
  type FoodItem,
  type FoodRecord,
} from '../store/food';
import { useCurrentUser } from '../store/auth';
import { useGoalStore } from '../store/goal';
import { estimateFood } from '../lib/food-api';
import { toast } from '../store/toast';
import { cn } from '../lib/utils';
import type { VoiceErrorCode } from '../lib/voice';

type Stage = 'idle' | 'transcribing' | 'estimating' | 'preview' | 'manual';

/**
 * RecordFood — PF-4's meal-entry flow.
 *
 * Two input modes that share the same downstream "preview" stage:
 *   1. Voice — long-press mic, get transcript, ask the AI estimator, show
 *      the result with per-item edit affordances + a Save CTA.
 *   2. Manual — no voice / browser doesn't support / user taps "type
 *      instead". Falls into the same ItemEditor + Save path.
 *
 * The PRD's "AI 估算超时 (>10s) → 降级为模糊估算" rule is handled by
 * `estimateFood` (timeout → still returns a result, just a low-confidence
 * one). Confidence < 0.6 paints the AI badge red and surfaces the "edit
 * estimate" CTA — the user can fix it inline without leaving the page.
 *
 * History sits below the editor so each save shows up immediately.
 */
export function RecordFoodPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const goal = useGoalStore((s) => s.goal);
  const records = useFoodStore((s) => s.records);
  const addRecord = useFoodStore((s) => s.addRecord);

  const [stage, setStage] = useState<Stage>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [aiSource, setAiSource] = useState<'openai' | 'heuristic' | null>(null);
  const [previewItems, setPreviewItems] = useState<FoodItem[]>([]);
  const [previewConfidence, setPreviewConfidence] = useState<number>(0);
  const [previewRecordedAt, setPreviewRecordedAt] = useState<number>(0);
  const [celebrating, setCelebrating] = useState(false);

  const [manualText, setManualText] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const requestSeqRef = useRef(0);

  const sortedRecords = useMemo(() => sortByDateDesc(records), [records]);
  const todaysRecords = useMemo(
    () => sortedRecords.filter((r) => isToday(r.recordedAt)),
    [sortedRecords],
  );

  const previewTotal = useMemo(
    () => previewItems.reduce((sum, item) => sum + item.calories, 0),
    [previewItems],
  );

  const goalKcalTarget = useMemo(() => {
    if (!goal) return null;
    // A simple kcal target heuristic: 30 kcal/kg body weight adjusted by
    // direction (lose → −15%, gain → +15%). MVP-grade; PF-8 will refine.
    const weightKg = goal.startWeight;
    const base = weightKg * 30;
    return goal.direction === 'lose' ? base * 0.85 : base * 1.15;
  }, [goal]);

  const startEstimate = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast({ variant: 'error', message: t('record.emptyInput') });
      return;
    }
    setTranscript(trimmed);
    setStage('estimating');
    const seq = ++requestSeqRef.current;
    const result = await estimateFood(trimmed);

    // Drop stale responses — if the user already started a new flow, don't
    // trample it with an old answer.
    if (seq !== requestSeqRef.current) return;

    if (!result.ok) {
      // `FoodEstimateOutcome` is a discriminated union; on the `ok: false`
      // branch `error` and `fallback` are both guaranteed present. The cast
      // is here only because TS 5.8's narrowing drops the discriminant on
      // a `noUncheckedIndexedAccess`-style file in this project — without
      // it the next two lines fail to compile.
      const failure = result as Extract<typeof result, { ok: false }>;
      const { error, fallback } = failure;
      setPreviewItems(fallback.items);
      setPreviewConfidence(fallback.confidence);
      setAiSource(fallback.source);
      const messageKey =
        error.code === 'timeout' ? 'record.errors.aiTimeout' : 'record.errors.aiGeneric';
      toast({ variant: 'info', message: t(messageKey) });
    } else {
      setPreviewItems(result.data.items);
      setPreviewConfidence(result.data.confidence);
      setAiSource(result.data.source);
    }
    setPreviewRecordedAt(Date.now());
    setStage('preview');
  };

  const reset = () => {
    setStage('idle');
    setTranscript('');
    setPreviewItems([]);
    setPreviewConfidence(0);
    setPreviewRecordedAt(0);
    setAiSource(null);
    setManualText('');
    requestSeqRef.current += 1;
  };

  const onVoiceResult = (text: string) => {
    void startEstimate(text);
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
    toast({ variant: 'error', message: map[code] ?? t('voice.not_understood') });
    if (code === 'not-supported') {
      // Browser doesn't support voice — drop the user straight into manual mode.
      setStage('manual');
    }
  };

  const onManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void startEstimate(manualText);
  };

  const onEditorChange = (next: FoodItem[]) => {
    setPreviewItems(next);
    // Editing implies the user is now the source of truth — bump confidence
    // so the badge flips to "AI estimate · 100%" (still honest; the user is
    // the one providing the numbers).
    setPreviewConfidence(1);
  };

  const onSave = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (previewItems.length === 0) {
      toast({ variant: 'error', message: t('record.emptyPreview') });
      return;
    }
    addRecord({
      userId: user.id,
      rawText: transcript || previewItems.map((i) => i.name).join(' + '),
      items: previewItems,
      totalCalories: previewTotal,
      aiConfidence: previewConfidence,
      mealSlot: classifyMealSlot(Date.now()),
      source: stage === 'manual' ? 'manual' : 'voice',
    });
    setCelebrating(true);
    window.setTimeout(() => setCelebrating(false), 1400);
    toast({ variant: 'success', message: t('record.savedToast', { value: Math.round(previewTotal) }) });
    reset();
  };

  const voiceExampleKey = i18n.language.startsWith('zh')
    ? 'record.voiceExampleZh'
    : 'record.voiceExampleEn';

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t('record.foodTitle')}
        subtitle={t('record.foodSubtitle')}
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

      {/* Today's totals — keeps the "what have I eaten" feel close at hand. */}
      <TodaySummary records={todaysRecords} goalKcal={goalKcalTarget} />

      {/* Main input card */}
      <Card
        raised
        className={cn(
          'relative mt-4 overflow-hidden transition-all duration-300',
          celebrating && 'ring-2 ring-brand-500/40',
        )}
      >
        {celebrating ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-100/40 via-transparent to-accent-100/40"
          />
        ) : null}
        <div className="relative">
          {(stage === 'idle' || stage === 'manual') && (
            <InputStage
              stage={stage}
              manualText={manualText}
              setManualText={setManualText}
              onManualSubmit={onManualSubmit}
              onVoiceResult={onVoiceResult}
              onVoiceError={onVoiceError}
              voiceExampleKey={voiceExampleKey}
              onSwitchMode={(next) => setStage(next)}
              transcript={transcript}
            />
          )}

          {stage === 'estimating' && <EstimatingState transcript={transcript} />}

          {stage === 'preview' && previewItems.length > 0 && (
            <PreviewState
              items={previewItems}
              totalCalories={previewTotal}
              confidence={previewConfidence}
              source={aiSource}
              transcript={transcript}
              recordedAt={previewRecordedAt}
              onItemEdit={() => setEditorOpen(true)}
              onEditEstimate={() => setEditorOpen(true)}
              onSave={onSave}
              onTryAgain={reset}
            />
          )}

          {stage === 'preview' && previewItems.length === 0 && (
            <EmptyResultState transcript={transcript} onManual={() => setStage('manual')} />
          )}
        </div>
      </Card>

      {/* Inline item editor — only mounted while open so each open
          starts with a fresh draft derived from the current items. */}
      {editorOpen ? (
        <ItemEditor
          items={previewItems}
          onChange={onEditorChange}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}

      {/* Today's log — group by meal slot for quick scanning. */}
      <TodayHistory records={todaysRecords} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

interface InputStageProps {
  stage: Stage;
  manualText: string;
  setManualText: (v: string) => void;
  onManualSubmit: (e: React.FormEvent) => void;
  onVoiceResult: (text: string) => void;
  onVoiceError: (code: VoiceErrorCode) => void;
  voiceExampleKey: string;
  onSwitchMode: (next: Stage) => void;
  transcript: string;
}

function InputStage({
  stage,
  manualText,
  setManualText,
  onManualSubmit,
  onVoiceResult,
  onVoiceError,
  voiceExampleKey,
  onSwitchMode,
  transcript,
}: InputStageProps) {
  const { t } = useTranslation();
  const isManual = stage === 'manual';

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        aria-hidden
        className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-md"
      >
        <Utensils className="size-7" />
      </div>

      <div className="w-full">
        <p className="text-center text-sm font-semibold text-[rgb(var(--fg-primary))]">
          {t('record.inputPrompt')}
        </p>
        <p className="mt-1 text-center text-xs text-[rgb(var(--fg-secondary))]">
          {t('record.inputSubPrompt')}
        </p>
      </div>

      {isManual ? (
        <form onSubmit={onManualSubmit} className="w-full">
          <Input
            label={t('record.manualLabel')}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={t('record.manualPlaceholder')}
            leadingIcon={<Keyboard className="size-4" aria-hidden />}
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            className="mt-3"
            disabled={!manualText.trim()}
            loading={false}
          >
            {t('record.estimateAction')}
          </Button>
          <button
            type="button"
            onClick={() => onSwitchMode('idle')}
            className="mt-2 inline-flex w-full items-center justify-center gap-1 text-xs text-[rgb(var(--fg-secondary))] hover:text-brand-600"
          >
            <Mic className="size-3" aria-hidden />
            {t('record.switchToVoice')}
          </button>
        </form>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <VoiceButton type="food" onResult={onVoiceResult} onError={onVoiceError} />
          <p className="text-xs text-[rgb(var(--fg-secondary))]">{t('voice.press_to_speak')}</p>
          <p className="max-w-[16rem] text-center text-[11px] leading-relaxed text-[rgb(var(--fg-subtle))]">
            {t(voiceExampleKey)}
          </p>
          {transcript ? (
            <p className="mt-1 max-w-[20rem] rounded-lg bg-[rgb(var(--bg-sunken))] px-3 py-1.5 text-center text-xs text-[rgb(var(--fg-primary))]">
              “{transcript}”
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => onSwitchMode('manual')}
            className="mt-2 inline-flex items-center gap-1 text-xs text-[rgb(var(--fg-secondary))] hover:text-brand-600"
          >
            <Keyboard className="size-3" aria-hidden />
            {t('record.switchToManual')}
          </button>
        </div>
      )}
    </div>
  );
}

function EstimatingState({ transcript }: { transcript: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <Loader2 className="size-10 animate-spin text-brand-500" aria-hidden />
      <p className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
        {t('record.estimating')}
      </p>
      <p className="max-w-[20rem] text-center text-xs text-[rgb(var(--fg-secondary))]">
        {transcript ? `“${transcript}”` : ''}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-[rgb(var(--fg-subtle))]">
        {t('record.estimatingHint')}
      </p>
    </div>
  );
}

interface PreviewStateProps {
  items: FoodItem[];
  totalCalories: number;
  confidence: number;
  source: 'openai' | 'heuristic' | null;
  transcript: string;
  /** Captured at the moment we transition into `preview` — keeps the
   *  card's clock stable across re-renders while the user is editing. */
  recordedAt: number;
  onItemEdit: () => void;
  onEditEstimate: () => void;
  onSave: () => void;
  onTryAgain: () => void;
}

function PreviewState({
  items,
  totalCalories,
  confidence,
  source,
  transcript,
  recordedAt,
  onItemEdit,
  onEditEstimate,
  onSave,
  onTryAgain,
}: PreviewStateProps) {
  const { t } = useTranslation();
  const previewRecord: Pick<FoodRecord, 'items' | 'totalCalories' | 'aiConfidence' | 'recordedAt' | 'source'> & {
    rawText?: string;
  } = {
    items,
    totalCalories,
    aiConfidence: confidence,
    recordedAt,
    source: 'voice',
    rawText: transcript,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
          {t('record.previewTitle')}
        </p>
        {source ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--bg-sunken))] px-2 py-0.5 text-[10px] font-medium text-[rgb(var(--fg-secondary))]">
            <Sparkles className="size-3" aria-hidden />
            {t(source === 'openai' ? 'record.sourceOpenai' : 'record.sourceHeuristic')}
          </span>
        ) : null}
      </div>
      <MealCard
        record={previewRecord}
        variant="confirm"
        onItemEdit={onItemEdit}
        onEditEstimate={onEditEstimate}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="primary"
          size="lg"
          block
          onClick={onSave}
          leadingIcon={<Sparkles className="size-4" aria-hidden />}
        >
          {t('record.saveCta', { value: Math.round(totalCalories) })}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onTryAgain}
          leadingIcon={<RefreshCw className="size-4" aria-hidden />}
        >
          {t('record.tryAgain')}
        </Button>
      </div>
    </div>
  );
}

function EmptyResultState({ transcript, onManual }: { transcript: string; onManual: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div
        aria-hidden
        className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger"
      >
        <AlertTriangle className="size-6" />
      </div>
      <p className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
        {t('record.emptyResultTitle')}
      </p>
      <p className="max-w-[24rem] text-center text-xs text-[rgb(var(--fg-secondary))]">
        {t('record.emptyResultBody', { text: transcript || '—' })}
      </p>
      <Button type="button" variant="primary" size="md" onClick={onManual} leadingIcon={<Keyboard className="size-4" aria-hidden />}>
        {t('record.switchToManual')}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Today's summary + history                                                   */
/* -------------------------------------------------------------------------- */

interface TodaySummaryProps {
  records: FoodRecord[];
  goalKcal: number | null;
}

function TodaySummary({ records, goalKcal }: TodaySummaryProps) {
  const { t } = useTranslation();
  const total = sumCalories(records);
  const ratio = goalKcal ? Math.min(total / goalKcal, 1.5) : 0;

  return (
    <Card raised>
      <div className="flex items-baseline justify-between">
        <p className="pf-section-title">{t('record.todayTitle')}</p>
        <p className="text-[11px] text-[rgb(var(--fg-subtle))]">{t('common.today')}</p>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-[rgb(var(--fg-primary))]">
        {Math.round(total)}
        <span className="ml-1 text-base font-medium text-[rgb(var(--fg-subtle))]">kcal</span>
      </p>
      <p className="mt-1 text-xs text-[rgb(var(--fg-secondary))]">
        {goalKcal
          ? t('record.todayOfTarget', { target: Math.round(goalKcal) })
          : t('record.todayNoTarget')}
      </p>
      {goalKcal ? (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--bg-sunken))]">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-out-quart"
            style={{ width: `${Math.min(ratio, 1) * 100}%` }}
          />
        </div>
      ) : null}
    </Card>
  );
}

function TodayHistory({ records }: { records: FoodRecord[] }) {
  const { t, i18n } = useTranslation();
  const groups = useMemo(() => groupByMealSlot(records), [records]);
  const slotOrder: Array<keyof typeof groups> = ['breakfast', 'lunch', 'dinner', 'snack'];

  if (records.length === 0) {
    return (
      <section className="mt-6">
        <h2 className="pf-section-title mb-3">{t('record.historyTitle')}</h2>
        <EmptyState
          emoji="🍱"
          title={t('record.historyEmpty')}
          description={t('record.historyEmptyHint')}
        />
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-4">
      <h2 className="pf-section-title">{t('record.historyTitle')}</h2>
      {slotOrder.map((slot) => {
        const list = groups[slot];
        if (list.length === 0) return null;
        const slotTotal = sumCalories(list);
        return (
          <div key={slot}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
                {t(`record.meal_${slot}`)}
              </p>
              <p className="text-xs font-medium text-[rgb(var(--fg-subtle))]">
                {Math.round(slotTotal)} kcal
              </p>
            </div>
            <ul className="space-y-2">
              {list.map((r) => (
                <li key={r.id}>
                  <MealCard record={r} compact />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="text-center text-[11px] text-[rgb(var(--fg-subtle))]">
        {t('record.servingHint', { locale: i18n.language.startsWith('zh') ? 'zh' : 'en' })}
      </p>
    </section>
  );
}

function isToday(ts: number): boolean {
  const now = new Date();
  const d = new Date(ts);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
