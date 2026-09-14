import { Dumbbell, Scale, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../lib/utils';

const RECORD_TYPES: Array<{
  key: 'weight' | 'meals' | 'workouts';
  icon: LucideIcon;
  to: string;
  hint: string;
  comingSoon: boolean;
  accent: 'brand' | 'accent' | 'warning';
}> = [
  {
    key: 'weight',
    icon: Scale,
    to: '/records/weight',
    hint: 'Log a weight reading — manual or by voice.',
    comingSoon: false,
    accent: 'brand',
  },
  {
    key: 'meals',
    icon: Utensils,
    to: '/records/food',
    hint: 'Voice-driven meal logging — wired in PF-4.',
    comingSoon: true,
    accent: 'warning',
  },
  {
    key: 'workouts',
    icon: Dumbbell,
    to: '/records/exercise',
    hint: 'Activity logging — wired in PF-5.',
    comingSoon: true,
    accent: 'accent',
  },
];

/**
 * Records tab — entry point for the three logging flows (weight / meals /
 * workouts). PF-3 wires the weight route up; meals + workouts route to
 * a placeholder card so navigation doesn't dead-end before PF-4/5 land.
 */
export function RecordsPage() {
  const { t } = useTranslation();
  return (
    <div className="animate-fade-in">
      <PageHeader title={t('records.title')} subtitle={t('records.subtitle')} />

      <div className="grid gap-3 sm:grid-cols-3">
        {RECORD_TYPES.map(({ key, icon: Icon, to, hint, comingSoon, accent }) => (
          <RecordCard
            key={key}
            to={to}
            icon={<Icon className="size-5" aria-hidden />}
            title={t(`records.${key}`)}
            hint={hint}
            comingSoon={comingSoon}
            accent={accent}
          />
        ))}
      </div>
    </div>
  );
}

interface RecordCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
  comingSoon: boolean;
  accent: 'brand' | 'accent' | 'warning';
}

function RecordCard({ to, icon, title, hint, comingSoon, accent }: RecordCardProps) {
  const accentClass = {
    brand: 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
    accent: 'bg-accent-100 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
    warning: 'bg-warning/15 text-warning-foreground dark:bg-warning/20 dark:text-warning',
  }[accent];

  return (
    <Link to={to} className="block">
      <Card className="pf-press h-full">
        <div className="flex items-start gap-3">
          <div className={cn('flex size-10 flex-shrink-0 items-center justify-center rounded-lg', accentClass)}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[rgb(var(--fg-primary))]">{title}</h2>
            <p className="mt-0.5 text-xs text-[rgb(var(--fg-secondary))]">{hint}</p>
            {comingSoon ? (
              <span className="pf-chip mt-2 text-[10px]">soon</span>
            ) : (
              <span className="pf-chip mt-2 text-[10px] bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                ready
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
