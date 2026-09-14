import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

/**
 * Three-up macro bars — protein / carbs / fat.
 *
 * Each bar shows the running total against a per-day target. Targets are
 * passed in (the page derives them from the user's goal direction); we
 * don't assume any particular nutrition model here so the page stays
 * flexible.
 *
 * Layout: 3 columns, each with a small label + bar + value. Brand-accent
 * colours are mapped from the design tokens.
 */
interface NutrientBarsProps {
  protein: { value: number; target: number };
  carbs: { value: number; target: number };
  fat: { value: number; target: number };
  /** Compact mode used inside MealCard rows; full mode for the daily total. */
  compact?: boolean;
  className?: string;
}

const TONE_BG: Record<'protein' | 'carbs' | 'fat', string> = {
  protein: 'bg-brand-500',
  carbs: 'bg-accent-500',
  fat: 'bg-warning',
};

const TONE_BG_SOFT: Record<'protein' | 'carbs' | 'fat', string> = {
  protein: 'bg-brand-100 dark:bg-brand-500/15',
  carbs: 'bg-accent-100 dark:bg-accent-500/15',
  fat: 'bg-warning/15',
};

export function NutrientBars({
  protein,
  carbs,
  fat,
  compact = false,
  className,
}: NutrientBarsProps) {
  const { t } = useTranslation();

  const rows: Array<{
    key: 'protein' | 'carbs' | 'fat';
    label: string;
    value: number;
    target: number;
  }> = [
    { key: 'protein', label: t('nutrient.protein'), value: protein.value, target: protein.target },
    { key: 'carbs', label: t('nutrient.carbs'), value: carbs.value, target: carbs.target },
    { key: 'fat', label: t('nutrient.fat'), value: fat.value, target: fat.target },
  ];

  return (
    <div
      className={cn(
        'grid gap-3',
        compact ? 'grid-cols-3 gap-2' : 'grid-cols-3',
        className,
      )}
      aria-label={t('nutrient.summary')}
    >
      {rows.map((row) => (
        <div key={row.key} className="min-w-0">
          <div className={cn('mb-1 flex items-baseline justify-between gap-1')}>
            <span
              className={cn(
                'truncate font-medium text-[rgb(var(--fg-secondary))]',
                compact ? 'text-[10px]' : 'text-xs',
              )}
            >
              {row.label}
            </span>
            <span
              className={cn(
                'tabular-nums font-semibold text-[rgb(var(--fg-primary))]',
                compact ? 'text-[10px]' : 'text-xs',
              )}
            >
              {Math.round(row.value)}
              <span className="ml-0.5 font-normal text-[rgb(var(--fg-subtle))]">g</span>
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={Math.max(row.target, 1)}
            aria-valuenow={Math.round(row.value)}
            aria-label={`${row.label}: ${Math.round(row.value)} of ${Math.round(row.target)} grams`}
            className={cn(
              'w-full overflow-hidden rounded-full',
              compact ? 'h-1.5' : 'h-2',
              TONE_BG_SOFT[row.key],
            )}
          >
            <div
              className={cn('h-full rounded-full transition-[width] duration-300 ease-out-quart', TONE_BG[row.key])}
              style={{ width: `${pct(row.value, row.target)}%` }}
            />
          </div>
          {!compact ? (
            <p className="mt-1 text-[10px] text-[rgb(var(--fg-subtle))]">
              {t('nutrient.targetLabel', { value: Math.round(row.target) })}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function pct(value: number, target: number): number {
  const safe = Math.max(target, 0.0001);
  return Math.max(0, Math.min(100, (value / safe) * 100));
}
