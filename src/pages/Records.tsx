import { Dumbbell, Scale, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../lib/utils';

type RecordKey = 'weight' | 'meals' | 'workouts';
type HintKey = 'weightHint' | 'mealsHint' | 'workoutsHint';

const RECORD_TYPES: Array<{
  key: RecordKey;
  icon: LucideIcon;
  to: string;
  hintKey: HintKey;
  comingSoon: boolean;
  accent: 'brand' | 'accent' | 'warning';
}> = [
  {
    key: 'weight',
    icon: Scale,
    to: '/records/weight',
    hintKey: 'weightHint',
    comingSoon: false,
    accent: 'brand',
  },
  {
    key: 'meals',
    icon: Utensils,
    to: '/records/food',
    hintKey: 'mealsHint',
    comingSoon: true,
    accent: 'warning',
  },
  {
    key: 'workouts',
    icon: Dumbbell,
    to: '/records/exercise',
    hintKey: 'workoutsHint',
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
        {RECORD_TYPES.map(({ key, icon: Icon, to, hintKey, comingSoon, accent }) => (
          <RecordCard
            key={key}
            to={to}
            icon={<Icon className="size-5" aria-hidden />}
            title={t(`records.${key}`)}
            hint={t(`records.${hintKey}`)}
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
  const { t } = useTranslation();
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
              <span className="pf-chip mt-2 text-[10px]">{t('records.chipSoon')}</span>
            ) : (
              <span className="pf-chip mt-2 text-[10px] bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                {t('records.chipReady')}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
