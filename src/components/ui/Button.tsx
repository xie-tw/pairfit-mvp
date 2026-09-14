import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Variants are kept intentionally small — PF-1 ships the scaffold only, so
 * the goal is a "good enough" Button that every later feature can rely on
 * without each PF reinventing its own.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300',
  secondary:
    'bg-[rgb(var(--bg-sunken))] text-[rgb(var(--fg-primary))] border border-[rgb(var(--border-default))] hover:bg-[rgb(var(--border-default))]',
  ghost:
    'bg-transparent text-[rgb(var(--fg-primary))] hover:bg-[rgb(var(--bg-sunken))]',
  outline:
    'bg-transparent text-[rgb(var(--fg-primary))] border border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--bg-sunken))]',
  accent:
    'bg-accent-500 text-white shadow-sm hover:bg-accent-600 active:bg-accent-700 disabled:bg-accent-300',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-md gap-2',
  lg: 'h-12 px-5 text-base rounded-md gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    leadingIcon,
    trailingIcon,
    block = false,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium',
        'transition-colors duration-200 ease-out-quart',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-[rgb(var(--bg-app))]',
        'disabled:cursor-not-allowed disabled:opacity-70',
        'pf-press',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {leadingIcon ? <span className="-ml-0.5 inline-flex">{leadingIcon}</span> : null}
      {children}
      {trailingIcon ? <span className="-mr-0.5 inline-flex">{trailingIcon}</span> : null}
    </button>
  );
});
