import { Activity, CalendarDays, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../lib/utils';

const PLACEHOLDER_BARS = [40, 55, 30, 80, 65, 90, 50];

/**
 * Trends tab — charts, streaks, weekly summaries.
 *
 * PF-1 ships a static sparkline-style visual so reviewers can sanity-check
 * the dark/light + responsive behavior. Real charting lands in PF-7.
 */
export function TrendsPage() {
  const { t } = useTranslation();
  return (
    <div className="animate-fade-in">
      <PageHeader title={t('trends.title')} subtitle={t('trends.subtitle')} />

      <Card raised>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
              This week
            </p>
            <p className="mt-1 text-2xl font-bold text-[rgb(var(--fg-primary))]">
              7 <span className="text-sm font-medium text-[rgb(var(--fg-subtle))]">active days</span>
            </p>
          </div>
          <div
            className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
            aria-hidden
          >
            <Activity className="size-5" />
          </div>
        </div>
        <div className="mt-5 flex h-40 items-end gap-2">
          {PLACEHOLDER_BARS.map((value, idx) => (
            <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div
                className={cn(
                  'w-full rounded-md transition-all',
                  idx === 5 ? 'bg-brand-500' : 'bg-brand-200 dark:bg-brand-500/30',
                )}
                style={{ height: `${value}%`, minHeight: '4px' }}
                aria-hidden
              />
              <span className="text-[10px] font-medium text-[rgb(var(--fg-subtle))]">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx]}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-xl bg-accent-100 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300"
              aria-hidden
            >
              <Flame className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
                Best streak
              </p>
              <p className="text-xl font-bold text-[rgb(var(--fg-primary))]">— days</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-xl bg-info-soft text-info dark:bg-info/15 dark:text-info"
              aria-hidden
            >
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
                Avg. week
              </p>
              <p className="text-xl font-bold text-[rgb(var(--fg-primary))]">—</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <EmptyState
          emoji="📈"
          title={t('common.comingSoon')}
          description="Detailed charts and partner comparison arrive in PF-7."
        />
      </div>
    </div>
  );
}
