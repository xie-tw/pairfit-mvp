import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Render the card as a "raised" panel with shadow + emphasized border. */
  raised?: boolean;
  /** Removes the default padding — useful when the card contains a list. */
  noPadding?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
}

export function Card({
  raised = false,
  noPadding = false,
  leading,
  trailing,
  title,
  subtitle,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[rgb(var(--border-default))]',
        raised ? 'bg-[rgb(var(--bg-elevated))] shadow-sm' : 'bg-[rgb(var(--bg-surface))]',
        !noPadding && 'p-4',
        className,
      )}
      {...rest}
    >
      {(title || subtitle || leading || trailing) && (
        <header className="mb-3 flex items-start gap-3">
          {leading ? <div className="flex-shrink-0">{leading}</div> : null}
          <div className="min-w-0 flex-1">
            {title ? (
              <h3 className="text-base font-semibold leading-tight text-[rgb(var(--fg-primary))]">
                {title}
              </h3>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 text-sm text-[rgb(var(--fg-secondary))]">{subtitle}</p>
            ) : null}
          </div>
          {trailing ? <div className="flex-shrink-0">{trailing}</div> : null}
        </header>
      )}
      {children}
    </div>
  );
}
