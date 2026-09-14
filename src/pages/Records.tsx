import { Dumbbell, Scale, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';

const RECORD_TYPES: Array<{
  key: 'weight' | 'meals' | 'workouts';
  icon: LucideIcon;
  comingSoon: string;
}> = [
  { key: 'weight', icon: Scale, comingSoon: 'Log a weight reading — wired in PF-3.' },
  { key: 'meals', icon: Utensils, comingSoon: 'Voice-driven meal logging — wired in PF-3 + PF-4.' },
  { key: 'workouts', icon: Dumbbell, comingSoon: 'Activity logging — wired in PF-3.' },
];

/**
 * Records tab — entry point for the three logging flows (weight / meals /
 * workouts). PF-1 ships only the route + navigation cards; real input UI
 * arrives in PF-3.
 */
export function RecordsPage() {
  const { t } = useTranslation();
  return (
    <div className="animate-fade-in">
      <PageHeader title={t('records.title')} subtitle={t('records.subtitle')} />

      <div className="grid gap-3 sm:grid-cols-3">
        {RECORD_TYPES.map(({ key, icon: Icon, comingSoon }) => (
          <Card key={key} className="pf-press cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <Icon className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
                  {t(`records.${key}`)}
                </h2>
                <p className="text-xs text-[rgb(var(--fg-secondary))]">{comingSoon}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <EmptyState
          emoji="📒"
          title={t('common.empty')}
          description="Your recent logs will appear here. Start by tapping one of the cards above."
        />
      </div>
    </div>
  );
}
