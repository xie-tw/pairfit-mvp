import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Keyboard, Mic, Pencil, Sparkles } from 'lucide-react';
import type { FoodItem, FoodRecord } from '../../store/food';
import { Card } from './Card';
import { NutrientBars } from './NutrientBars';
import { cn } from '../../lib/utils';

/**
 * MealCard — a single food record, either freshly estimated (in the
 * confirm-and-save step) or already saved (history list).
 *
 * Two visual variants:
 *   - `view`     — read-only, no edit affordances, used in history.
 *   - `confirm`  — primary CTA to save, plus per-item edit triggers.
 *
 * Per the design spec:
 *   - Total calories + macro bars at the bottom.
 *   - AI badge with the confidence %. When confidence < 0.6 we paint the
 *     badge red and add an explicit "edit estimate" prompt.
 *   - Time + source icon at the top.
 */
interface MealCardProps {
  record: Pick<FoodRecord, 'items' | 'totalCalories' | 'aiConfidence' | 'recordedAt' | 'source'> & {
    rawText?: string;
  };
  variant?: 'view' | 'confirm';
  /** Compact mode trims padding and the macro bar — used inside lists. */
  compact?: boolean;
  /** Handler when the user taps an item row to edit. */
  onItemEdit?: (index: number) => void;
  /** Handler when the user taps the "edit estimate" link. */
  onEditEstimate?: () => void;
  className?: string;
}

const LOW_CONFIDENCE = 0.6;

export function MealCard({
  record,
  variant = 'view',
  compact = false,
  onItemEdit,
  onEditEstimate,
  className,
}: MealCardProps) {
  const { t, i18n } = useTranslation();
  const lowConfidence = record.aiConfidence < LOW_CONFIDENCE;

  const recordedTime = useMemo(() => {
    const d = new Date(record.recordedAt);
    return d.toLocaleTimeString(i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, [record.recordedAt, i18n.language]);

  const macros = useMemo(
    () =>
      record.items.reduce(
        (acc, item) => ({
          p: acc.p + (item.p ?? 0),
          c: acc.c + (item.c ?? 0),
          f: acc.f + (item.f ?? 0),
        }),
        { p: 0, c: 0, f: 0 },
      ),
    [record.items],
  );

  // We don't have a per-meal macro target — use a simple placeholder of
  // the *full day's* target split across meals. The page passes the
  // absolute totals; this component just needs the per-row "of N" feel.
  // Using the meal's own total as the bar reference keeps the visual
  // honest at a glance: 100% = "this meal met its per-meal budget".
  const perMealBudget = useMemo(() => Math.max(record.totalCalories, 1) * 0.33, [record.totalCalories]);

  return (
    <Card raised className={cn(compact && 'p-3', className)}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--fg-secondary))]">
          <time dateTime={new Date(record.recordedAt).toISOString()}>{recordedTime}</time>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            {record.source === 'voice' ? (
              <>
                <Mic className="size-3" aria-hidden />
                {t('record.sourceVoice')}
              </>
            ) : (
              <>
                <Keyboard className="size-3" aria-hidden />
                {t('record.sourceManual')}
              </>
            )}
          </span>
        </div>
        {variant === 'confirm' ? (
          <button
            type="button"
            onClick={onEditEstimate}
            className="pf-press inline-flex items-center gap-1 rounded-full bg-[rgb(var(--bg-sunken))] px-2 py-1 text-[10px] font-medium text-[rgb(var(--fg-secondary))] hover:bg-[rgb(var(--border-default))]"
            aria-label={t('record.editEstimate')}
          >
            <Pencil className="size-3" aria-hidden />
            {t('record.editEstimate')}
          </button>
        ) : null}
      </header>

      <ul className="divide-y divide-[rgb(var(--border-default))]">
        {record.items.map((item, idx) => (
          <ItemRow
            key={`${item.name}-${idx}`}
            item={item}
            editable={variant === 'confirm' && Boolean(onItemEdit)}
            onEdit={onItemEdit ? () => onItemEdit(idx) : undefined}
          />
        ))}
      </ul>

      <div className="mt-3 space-y-3 border-t border-[rgb(var(--border-default))] pt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
            {t('record.totalLabel')}
          </span>
          <span className="text-xl font-bold tabular-nums text-[rgb(var(--fg-primary))]">
            {Math.round(record.totalCalories)}
            <span className="ml-1 text-xs font-medium text-[rgb(var(--fg-subtle))]">kcal</span>
          </span>
        </div>

        {!compact ? (
          <NutrientBars
            protein={{ value: macros.p, target: Math.max(perMealBudget * 0.3, 1) }}
            carbs={{ value: macros.c, target: Math.max(perMealBudget * 0.5, 1) }}
            fat={{ value: macros.f, target: Math.max(perMealBudget * 0.2, 1) }}
            compact
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
              lowConfidence
                ? 'bg-danger-soft text-danger dark:bg-danger/20'
                : 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200',
            )}
            aria-label={
              lowConfidence
                ? t('record.confidenceA11yLow', { pct: Math.round(record.aiConfidence * 100) })
                : t('record.confidenceA11y', { pct: Math.round(record.aiConfidence * 100) })
            }
          >
            {lowConfidence ? (
              <AlertTriangle className="size-3" aria-hidden />
            ) : (
              <Sparkles className="size-3" aria-hidden />
            )}
            {t('record.aiEstimate')} · {Math.round(record.aiConfidence * 100)}%
          </span>
          {lowConfidence ? (
            <span className="text-[10px] text-[rgb(var(--fg-secondary))]">
              {t('record.lowConfidenceHint')}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

interface ItemRowProps {
  item: FoodItem;
  editable: boolean;
  onEdit?: () => void;
}

function ItemRow({ item, editable, onEdit }: ItemRowProps) {
  const { t } = useTranslation();
  const Tag = editable ? 'button' : 'div';
  return (
    <li>
      <Tag
        type={editable ? 'button' : undefined}
        onClick={editable ? onEdit : undefined}
        className={cn(
          'flex w-full items-center justify-between gap-3 py-2 text-left',
          editable && 'pf-press rounded-md hover:bg-[rgb(var(--bg-sunken))]',
        )}
        aria-label={
          editable
            ? t('record.editItemA11y', { name: item.name })
            : item.name
        }
      >
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="text-base leading-none">
            {item.emoji ?? '🍽️'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[rgb(var(--fg-primary))]">{item.name}</p>
            <p className="text-[10px] text-[rgb(var(--fg-secondary))]">
              P {Math.round(item.p)}g · C {Math.round(item.c)}g · F {Math.round(item.f)}g
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-[rgb(var(--fg-primary))]">
            {Math.round(item.calories)}<span className="ml-0.5 text-[10px] font-normal text-[rgb(var(--fg-subtle))]">kcal</span>
          </span>
          {editable ? <Pencil className="size-3 text-[rgb(var(--fg-subtle))]" aria-hidden /> : null}
        </div>
      </Tag>
    </li>
  );
}
