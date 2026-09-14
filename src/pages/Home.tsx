import { ArrowRight, Flame, Sparkles, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../lib/utils';

/**
 * Home — landing tab.
 *
 * PF-1 scope: visual skeleton only. Real progress, "today's plan", partner
 * status, and recommendations land in PF-3 (records) and PF-4 (home feed).
 */
export function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t('home.title')}
        subtitle={t('home.subtitle')}
        trailing={
          <button
            type="button"
            className="pf-press inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--fg-primary))] hover:bg-[rgb(var(--bg-sunken))]"
          >
            <Flame className="size-3.5 text-brand-500" aria-hidden />
            <span>Streak</span>
            <Sparkles className="size-3.5 text-[rgb(var(--fg-subtle))]" aria-hidden />
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ProgressCard
          accent="brand"
          title={t('home.youProgress')}
          target="0 kg"
          current="0"
          hint="Set a goal to start tracking"
        />
        <ProgressCard
          accent="accent"
          title={t('home.partnerProgress')}
          target="0 kg"
          current="0"
          hint="Bind a partner to share progress"
        />
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="pf-section-title">{t('home.todayGoal')}</h2>
          <Link
            to="/records"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            {t('home.viewAll')}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <EmptyState
          emoji="🎯"
          title={t('common.comingSoon')}
          description="Daily goal cards will appear here once PF-3 lands."
        />
      </section>
    </div>
  );
}

interface ProgressCardProps {
  accent: 'brand' | 'accent';
  title: string;
  target: string;
  current: string;
  hint: string;
}

function ProgressCard({ accent, title, target, current, hint }: ProgressCardProps) {
  return (
    <Card raised>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[rgb(var(--fg-primary))]">
            {current}
            <span className="ml-1 text-base font-medium text-[rgb(var(--fg-subtle))]">/ {target}</span>
          </p>
        </div>
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-full',
            accent === 'brand' ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
            : 'bg-accent-100 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
          )}
          aria-hidden
        >
          <TrendingUp className="size-5" />
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--bg-sunken))]">
        <div
          className={cn(
            'h-full rounded-full',
            accent === 'brand' ? 'bg-brand-500' : 'bg-accent-500',
          )}
          style={{ width: '0%' }}
        />
      </div>
      <p className="mt-3 text-xs text-[rgb(var(--fg-subtle))]">{hint}</p>
    </Card>
  );
}
