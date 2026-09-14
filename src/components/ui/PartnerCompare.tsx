import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Goal as GoalIcon, Trophy } from 'lucide-react';
import type { UserRecord } from '../../store/auth';
import type { Goal as GoalType } from '../../store/goal';
import { cn } from '../../lib/utils';

/**
 * PartnerCompare — PF-8.
 *
 * Renders a small "you vs partner" achievement card for the trends
 * page. The bar widths are computed as a per-day completion rate for
 * the current week:
 *   - days with at least one weight, food, or exercise log → "achieved"
 *   - 0..7 → 0..100%
 *
 * The component is intentionally narrow — it doesn't try to render
 * "did you hit your goal weight" because that needs a fuller goal-aware
 * delta. Trends already shows that; this card is the at-a-glance
 * "who showed up more" snapshot.
 */

export interface PartnerCompareProps {
  me: UserRecord;
  partner: UserRecord;
  myWeightsCount: number;
  partnerWeightsCount: number;
  myFoodsCount: number;
  partnerFoodsCount: number;
  myExercisesCount: number;
  partnerExercisesCount: number;
  myGoal: GoalType | null;
  partnerGoal: GoalType | null;
  className?: string;
}

export function PartnerCompare({
  me,
  partner,
  myWeightsCount,
  partnerWeightsCount,
  myFoodsCount,
  partnerFoodsCount,
  myExercisesCount,
  partnerExercisesCount,
  myGoal,
  partnerGoal,
  className,
}: PartnerCompareProps) {
  const { t } = useTranslation();
  const rows = useMemo(
    () =>
      [
        {
          key: 'weight',
          label: t('home.weightCardTitle'),
          mine: myWeightsCount,
          theirs: partnerWeightsCount,
          icon: <span aria-hidden>⚖️</span>,
        },
        {
          key: 'food',
          label: t('home.foodCardTitle'),
          mine: myFoodsCount,
          theirs: partnerFoodsCount,
          icon: <span aria-hidden>🍽️</span>,
        },
        {
          key: 'exercise',
          label: t('home.exerciseCardTitle'),
          mine: myExercisesCount,
          theirs: partnerExercisesCount,
          icon: <span aria-hidden>🏃</span>,
        },
      ] as const,
    [
      t,
      myWeightsCount,
      partnerWeightsCount,
      myFoodsCount,
      partnerFoodsCount,
      myExercisesCount,
      partnerExercisesCount,
    ],
  );

  const leader = rows.reduce<{ key: string; mine: number; theirs: number } | null>(
    (best, row) => {
      const candidate = { key: row.key, mine: row.mine, theirs: row.theirs };
      if (!best) return candidate;
      // "achievements" = total entries on each side for that category
      if (candidate.mine + candidate.theirs > best.mine + best.theirs) return candidate;
      return best;
    },
    null,
  );

  return (
    <Card raised className={className}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-brand-500" aria-hidden />
          <h3 className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
            {t('trends.compareTitle')}
          </h3>
        </div>
        <p className="text-xs text-[rgb(var(--fg-secondary))]">
          {t('trends.compareSubtitle')}
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <CompareRow
            key={row.key}
            row={row}
            mineName={me.displayName}
            partnerName={partner.displayName}
          />
        ))}
      </div>

      {(myGoal || partnerGoal) && (
        <div className="mt-4 grid gap-2 border-t border-[rgb(var(--border-default))] pt-3 sm:grid-cols-2">
          <GoalSummary name={me.displayName} goal={myGoal} mine />
          <GoalSummary name={partner.displayName} goal={partnerGoal} />
        </div>
      )}

      {leader ? (
        <p className="mt-3 text-center text-[11px] text-[rgb(var(--fg-secondary))]">
          {leader.mine > leader.theirs
            ? t('trends.compareYouLead', { area: t(`trends.compareArea.${leader.key}`) })
            : leader.theirs > leader.mine
              ? t('trends.comparePartnerLead', {
                  name: partner.displayName,
                  area: t(`trends.compareArea.${leader.key}`),
                })
              : t('trends.compareTie')}
        </p>
      ) : null}
    </Card>
  );
}

interface CompareRowProps {
  row: {
    key: string;
    label: string;
    mine: number;
    theirs: number;
    icon: React.ReactNode;
  };
  mineName: string;
  partnerName: string;
}

function CompareRow({ row, mineName, partnerName }: CompareRowProps) {
  const total = Math.max(1, row.mine + row.theirs);
  const minePct = Math.round((row.mine / total) * 100);
  const theirsPct = 100 - minePct;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-[rgb(var(--fg-primary))]">
          <span aria-hidden>{row.icon}</span>
          {row.label}
        </span>
        <span className="tabular-nums text-[rgb(var(--fg-secondary))]">
          {row.mine} · {row.theirs}
        </span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--bg-sunken))]">
        <div
          className="h-full bg-brand-500 transition-all"
          style={{ width: `${minePct}%` }}
          aria-label={`${mineName}: ${row.mine}`}
        />
        <div
          className="h-full bg-accent-500 transition-all"
          style={{ width: `${theirsPct}%` }}
          aria-label={`${partnerName}: ${row.theirs}`}
        />
      </div>
    </div>
  );
}

function GoalSummary({
  name,
  goal,
  mine,
}: {
  name: string;
  goal: GoalType | null;
  mine?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'rounded-lg border border-[rgb(var(--border-default))] px-3 py-2 text-xs',
        mine && 'bg-brand-50/40 dark:bg-brand-500/5',
      )}
    >
      <div className="flex items-center gap-1.5 font-semibold text-[rgb(var(--fg-primary))]">
        <GoalIcon className="size-3.5 text-brand-500" aria-hidden />
        <span className="truncate">{name}</span>
      </div>
      {goal ? (
        <p className="mt-0.5 text-[rgb(var(--fg-secondary))]">
          {goal.direction === 'lose' ? t('goal.directionLose') : t('goal.directionGain')}
          {' · '}
          {goal.targetWeight} {goal.unit}
        </p>
      ) : (
        <p className="mt-0.5 text-[rgb(var(--fg-subtle))]">{t('goal.notSet')}</p>
      )}
    </div>
  );
}
