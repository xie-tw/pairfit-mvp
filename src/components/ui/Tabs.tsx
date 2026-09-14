import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Underlined tab strip. Used by the trends page (7/30/90 days) and the
 * records picker (weight / food / exercise).
 *
 * This is a *presentational* component — it does not own selection. The
 * parent owns the active key and reacts to `onChange`. That way a page can
 * switch from URL state (`useSearchParams`) or component state without
 * the tabs caring.
 */
export interface TabsOption<T extends string> {
  key: T;
  label: ReactNode;
}

interface TabsProps<T extends string> {
  options: Array<TabsOption<T>>;
  value: T;
  onChange: (next: T) => void;
  /** ARIA label for the tablist. Defaults to a generic string. */
  ariaLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = 'Tabs',
  className,
  size = 'md',
}: TabsProps<T>) {
  const baseId = useId();
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-sunken))]/60 p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = opt.key === value;
        return (
          <button
            key={opt.key}
            id={`${baseId}-tab-${opt.key}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`${baseId}-panel-${opt.key}`}
            onClick={() => onChange(opt.key)}
            className={cn(
              'inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 ease-out-quart pf-press',
              size === 'sm' ? 'h-7 px-3 text-xs' : 'h-9 px-4 text-sm',
              isActive
                ? 'bg-[rgb(var(--bg-surface))] text-[rgb(var(--fg-primary))] shadow-sm'
                : 'text-[rgb(var(--fg-secondary))] hover:text-[rgb(var(--fg-primary))]',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
