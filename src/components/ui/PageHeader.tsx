import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  className?: string;
}

/**
 * Standard "title + subtitle" page header used on every tab route.
 * Keeps spacing, hierarchy, and color consistent across the app.
 */
export function PageHeader({ title, subtitle, trailing, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-[rgb(var(--fg-primary))] sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">{subtitle}</p>
        ) : null}
      </div>
      {trailing ? <div className="flex-shrink-0">{trailing}</div> : null}
    </header>
  );
}
