import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

/**
 * Lightweight toggle switch — PF-9 settings page.
 *
 * Thin wrapper over a real `<input type="checkbox" role="switch">` so
 * assistive tech reads it correctly. Visual is a pill that fills with
 * brand color when on. Kept here (rather than reused from somewhere
 * external) because there is no other consumer yet and the design
 * tokens (`brand-500`, `bg-sunken`) are local.
 */
export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { checked, onChange, label, description, disabled = false, className },
  ref,
) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-3 transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:bg-[rgb(var(--bg-sunken))]/60',
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[rgb(var(--fg-primary))]">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-[rgb(var(--fg-secondary))]">
            {description}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-brand-500' : 'bg-[rgb(var(--border-strong))]',
        )}
        aria-hidden
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </span>
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  );
});