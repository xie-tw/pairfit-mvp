import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  /** Big emoji or icon used as the illustration. */
  emoji?: string;
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Friendly empty state. Every list / screen should ship with one so the
 * blank scaffold never presents the user with a white wall (per the PM's UI
 * requirements).
 */
export function EmptyState({ emoji, icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl px-6 py-12 text-center',
        'bg-[rgb(var(--bg-sunken))]/60 border border-dashed border-[rgb(var(--border-default))]',
        className,
      )}
    >
      <div
        className={cn(
          'mb-3 flex size-14 items-center justify-center rounded-full',
          'bg-[rgb(var(--bg-surface))] shadow-sm',
        )}
        aria-hidden
      >
        {icon ? (
          icon
        ) : emoji ? (
          <span className="text-2xl leading-none">{emoji}</span>
        ) : (
          <span className="text-xl text-[rgb(var(--fg-subtle))]">·</span>
        )}
      </div>
      <h3 className="text-base font-semibold text-[rgb(var(--fg-primary))]">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-xs text-sm text-[rgb(var(--fg-secondary))]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
