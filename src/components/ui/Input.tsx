import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Form input — the workhorse for auth + profile forms.
 *
 * Variants:
 *   - `default` — neutral input
 *   - `error`   — red ring + error message below
 *
 * PairFit's form pattern: every field carries a label (visible on focus
 * or filled) and an inline error string. We forward refs so pages can
 * focus the first invalid field on submit.
 */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: ReactNode;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  containerClassName?: string;
  /** Right-aligned content shown next to the label (e.g. "Forgot?" link). */
  labelTrailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    leadingIcon,
    trailingIcon,
    labelTrailing,
    containerClassName,
    className,
    id,
    type = 'text',
    autoComplete,
    required,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? `pf-input-${autoId}`;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  const invalid = Boolean(error);

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[rgb(var(--fg-primary))]"
        >
          {label}
          {required ? <span className="ml-0.5 text-brand-500" aria-hidden>*</span> : null}
        </label>
        {labelTrailing ? <div className="flex-shrink-0">{labelTrailing}</div> : null}
      </div>
      <div
        className={cn(
          'group relative flex items-center rounded-lg border bg-[rgb(var(--bg-surface))]',
          'transition-colors duration-150',
          invalid
            ? 'border-danger focus-within:border-danger focus-within:ring-2 focus-within:ring-danger/30'
            : 'border-[rgb(var(--border-default))] focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20',
        )}
      >
        {leadingIcon ? (
          <span
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center text-[rgb(var(--fg-secondary))]',
              'border-r border-[rgb(var(--border-default))]',
            )}
            aria-hidden
          >
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          type={type}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full flex-1 bg-transparent px-3 text-sm text-[rgb(var(--fg-primary))]',
            'placeholder:text-[rgb(var(--fg-subtle))]',
            'focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            className,
          )}
          {...rest}
        />
        {trailingIcon ? (
          <span
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-[rgb(var(--fg-secondary))]"
            aria-hidden
          >
            {trailingIcon}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-[rgb(var(--fg-subtle))]">
          {hint}
        </p>
      ) : null}
    </div>
  );
});