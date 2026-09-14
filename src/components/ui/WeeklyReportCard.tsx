import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import {
  generateWeeklyReport,
  startOfIsoWeek,
  type WeeklyReportOutcome,
} from '../../lib/weekly-report-api';
import {
  reportForWeek,
  useWeeklyReportStore,
  type CachedWeeklyReport,
} from '../../store/weeklyReport';
import type { WeightRecord } from '../../store/weight';
import type { FoodRecord } from '../../store/food';
import type { ExerciseRecord } from '../../store/exercise';
import type { Goal } from '../../store/goal';
import { cn } from '../../lib/utils';

/**
 * AI Weekly Report — PF-8.
 *
 * Renders the cached report for the current ISO week when present,
 * otherwise generates a fresh one. The store keys on the week-start
 * timestamp so re-opening Trends / Me on the same Monday always shows
 * the cached copy without re-calling the LLM (PRD §4 acceptance:
 * "same week again → no repeat call").
 *
 * When the API fails the card still renders — the lib hands us a
 * deterministic fallback so the surface never goes blank.
 */

export interface WeeklyReportCardProps {
  weights: WeightRecord[];
  foods: FoodRecord[];
  exercises: ExerciseRecord[];
  goal: Goal | null;
  /** Display the manual refresh button. Defaults to true on Trends, false on Me. */
  allowRefresh?: boolean;
  className?: string;
}

type Phase = 'idle' | 'loading' | 'ready' | 'error';

export function WeeklyReportCard({
  weights,
  foods,
  exercises,
  goal,
  allowRefresh = true,
  className,
}: WeeklyReportCardProps) {
  const { t } = useTranslation();
  const cached = useWeeklyReportStore((s) => s.reports);
  const setReport = useWeeklyReportStore((s) => s.setReport);

  const currentWeek = useMemo(() => startOfIsoWeek(), []);
  const thisWeekReport = useMemo(() => reportForWeek(cached, currentWeek), [cached, currentWeek]);

  // Phase reflects the current async state — derived instead of mirrored
  // in an effect, so a week rollover (cached entry disappears) falls back
  // to `idle` on the next render without cascading renders.
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<WeeklyReportOutcome | null>(null);
  const phase: Phase = loading
    ? 'loading'
    : thisWeekReport
      ? 'ready'
      : 'idle';

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const outcome = await generateWeeklyReport({
        weights,
        foods,
        exercises,
        goal,
        weekStart: currentWeek,
      });
      setLastResult(outcome);
      // `outcome` is a discriminated union — `ok: true` carries `data`,
      // `ok: false` carries `fallback`. Both paths resolve to the same
      // `WeeklyReportResponse` shape, but TS needs help picking the right
      // branch because the union shares no common property beyond `ok`.
      const report: CachedWeeklyReport['report'] =
        outcome.ok === true ? outcome.data : outcome.fallback;
      setReport({
        weekStart: currentWeek,
        generatedAt: Date.now(),
        report,
        isSparse: !hasUsableData({ weights, foods, exercises }, currentWeek),
      });
    } finally {
      setLoading(false);
    }
  }, [weights, foods, exercises, goal, currentWeek, setReport]);

  const report: CachedWeeklyReport | null = thisWeekReport;

  return (
    <Card raised className={cn('overflow-hidden', className)}>
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/15 to-accent-500/15 text-brand-500 dark:text-brand-300"
        >
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-[rgb(var(--fg-primary))]">
              {report?.report.summary ?? t('trends.aiReportTitle')}
            </h3>
            {allowRefresh ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void generate();
                }}
                disabled={phase === 'loading'}
                aria-label={t('trends.aiReportRefresh')}
              >
                {phase === 'loading' ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-3.5" aria-hidden />
                )}
                <span className="sr-only">{t('trends.aiReportRefresh')}</span>
              </Button>
            ) : null}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[rgb(var(--fg-secondary))]">
            <Calendar className="size-3.5" aria-hidden />
            <span>{formatWeekRange(currentWeek)}</span>
            {report?.report.source === 'heuristic' ? (
              <span className="rounded-full bg-[rgb(var(--bg-sunken))] px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                {t('trends.aiReportLocal')}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {phase === 'idle' ? (
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => {
              void generate();
            }}
          >
            <Sparkles className="size-4" aria-hidden />
            {t('trends.aiReportCta')}
          </Button>
        ) : phase === 'loading' ? (
          <SkeletonBullets />
        ) : (
          <BulletList report={report?.report ?? null} />
        )}

        {lastResult && !lastResult.ok && phase === 'ready' ? (
          <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning dark:bg-warning/15">
            {t('trends.aiReportFallbackHint')}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function BulletList({ report }: { report: WeeklyReportPayload | null }) {
  const { t } = useTranslation();
  if (!report || report.bullets.length === 0) {
    return (
      <p className="rounded-lg bg-[rgb(var(--bg-sunken))] px-3 py-2 text-sm text-[rgb(var(--fg-secondary))]">
        {t('trends.aiReportEmpty')}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {report.bullets.map((b, idx) => (
        <li
          key={`${b.emoji}-${idx}`}
          className="flex items-start gap-2 text-sm leading-relaxed text-[rgb(var(--fg-primary))]"
        >
          <span aria-hidden className="mt-0.5 text-base leading-none">
            {b.emoji}
          </span>
          <span className="flex-1">{b.text}</span>
        </li>
      ))}
    </ul>
  );
}

function SkeletonBullets() {
  return (
    <ul aria-hidden className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1 size-4 animate-pulse rounded-full bg-[rgb(var(--bg-sunken))]" />
          <span
            className="h-4 flex-1 animate-pulse rounded bg-[rgb(var(--bg-sunken))]"
            style={{ width: `${85 - i * 10}%` }}
          />
        </li>
      ))}
    </ul>
  );
}

type WeeklyReportPayload = CachedWeeklyReport['report'];

function formatWeekRange(weekStart: number): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

function hasUsableData(
  input: { weights: WeightRecord[]; foods: FoodRecord[]; exercises: ExerciseRecord[] },
  weekStart: number,
): boolean {
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
  const inWindow = (ts: number) => ts >= weekStart && ts < weekEnd;
  return (
    input.weights.some((r) => inWindow(r.recordedAt)) ||
    input.foods.some((r) => inWindow(r.recordedAt)) ||
    input.exercises.some((r) => inWindow(r.recordedAt))
  );
}
