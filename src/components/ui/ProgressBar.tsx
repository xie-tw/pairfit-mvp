import { cn } from '../../lib/utils';

/**
 * Horizontal progress bar.
 *
 * - `value` and `max` are both required and untyped numerically (caller
 *   decides the unit). The bar shows `value / max`, clamped to `[0, 1]`.
 * - The track is `bg-sunken` and the fill picks an accent from the design
 *   tokens: brand (default), accent, success. Callers use `tone` to pick.
 * - An optional `label` slot lets callers annotate the bar (e.g. "62%").
 */
interface ProgressBarProps {
  value: number;
  max: number;
  tone?: 'brand' | 'accent' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  ariaLabel?: string;
  className?: string;
}

const TONE_FILL: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  brand: 'bg-brand-500',
  accent: 'bg-accent-500',
  success: 'bg-success',
  warning: 'bg-warning',
};

const SIZE_TRACK: Record<NonNullable<ProgressBarProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  value,
  max,
  tone = 'brand',
  size = 'md',
  showLabel = false,
  ariaLabel,
  className,
}: ProgressBarProps) {
  const safeMax = Math.max(max, 0.0001);
  const pct = Math.max(0, Math.min(1, value / safeMax));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
        aria-label={ariaLabel}
        className={cn('w-full overflow-hidden rounded-full bg-[rgb(var(--bg-sunken))]', SIZE_TRACK[size])}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-300 ease-out-quart', TONE_FILL[tone])}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      {showLabel ? (
        <span className="min-w-[3ch] text-right text-xs font-semibold tabular-nums text-[rgb(var(--fg-secondary))]">
          {Math.round(pct * 100)}%
        </span>
      ) : null}
    </div>
  );
}
