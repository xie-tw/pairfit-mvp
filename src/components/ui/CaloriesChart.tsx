import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import type { FoodRecord } from '../../store/food';
import { cn } from '../../lib/utils';

/**
 * CaloriesChart — daily calorie totals as stacked bars with
 * protein / carbs / fat split.
 *
 * Reads FoodRecord[] and buckets entries by local-day. Each bar stacks
 * the macros (protein*4 + carbs*4 + fat*9 ≈ totalCalories, but we render
 * the actual numbers from the store rather than re-deriving).
 *
 * The partner overlay (`secondary`) reuses the same bucketing and shows
 * up as a translucent dashed line so two people's data stays readable
 * when they share a device.
 */

export interface CaloriesChartProps {
  records: FoodRecord[];
  windowDays: number;
  className?: string;
  /** Optional partner data — rendered as a translucent overlay. */
  secondaryRecords?: FoodRecord[] | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface DayDatum {
  dayKey: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  partnerCalories: number;
}

export function CaloriesChart({
  records,
  windowDays,
  className,
  secondaryRecords,
}: CaloriesChartProps) {
  const { t } = useTranslation();
  const data = useMemo(
    () => buildSeries(records, secondaryRecords ?? null, windowDays),
    [records, secondaryRecords, windowDays],
  );

  // Hooks must run unconditionally — `useMemo` for the domain has to
  // happen *before* any early return.
  const { max } = useMemo(() => computeDomain(data), [data]);

  if (data.every((d) => d.calories === 0 && d.partnerCalories === 0)) {
    return (
      <div
        className={cn(
          'flex h-48 items-center justify-center rounded-xl border border-dashed border-[rgb(var(--border-default))] text-sm text-[rgb(var(--fg-secondary))]',
          className,
        )}
      >
        <span>{t('trends.emptyCalories')}</span>
      </div>
    );
  }

  return (
    <div className={cn('h-48 w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-default))" vertical={false} />
          <XAxis
            dataKey="dayKey"
            type="number"
            domain={['dataMin', 'dataMax']}
            scale="time"
            tickFormatter={formatTickDate}
            stroke="rgb(var(--fg-subtle))"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            domain={[0, max]}
            tickFormatter={(v: number) => `${Math.round(v)}`}
            stroke="rgb(var(--fg-subtle))"
            tick={{ fontSize: 11 }}
            width={40}
            tickLine={false}
            axisLine={false}
            unit=" kcal"
          />
          <Tooltip
            content={<CaloriesTooltip />}
            cursor={{ fill: 'rgb(var(--bg-sunken))', opacity: 0.4 }}
          />
          <Bar
            dataKey="protein"
            stackId="me"
            fill="rgb(var(--brand-rgb, 255 107 107))"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
            name={t('trends.seriesProtein')}
          />
          <Bar
            dataKey="carbs"
            stackId="me"
            fill="rgb(var(--accent-rgb, 20 184 166))"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
            name={t('trends.seriesCarbs')}
          />
          <Bar
            dataKey="fat"
            stackId="me"
            fill="#F59E0B"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            name={t('trends.seriesFat')}
          />
          {secondaryRecords ? (
            <Bar
              dataKey="partnerCalories"
              stackId="partner"
              fill="rgb(var(--fg-secondary))"
              fillOpacity={0.18}
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
              name={t('trends.seriesPartner')}
            />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildSeries(
  records: FoodRecord[],
  secondary: FoodRecord[] | null,
  windowDays: number,
): DayDatum[] {
  const today = startOfDay(Date.now());
  const startDay = today - (windowDays - 1) * MS_PER_DAY;
  const days: DayDatum[] = [];
  for (let i = 0; i < windowDays; i += 1) {
    days.push({
      dayKey: startDay + i * MS_PER_DAY,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      partnerCalories: 0,
    });
  }

  const fillDay = (rec: FoodRecord, target: 'me' | 'partner') => {
    const day = startOfDay(rec.recordedAt);
    if (day < startDay || day > today) return;
    const bucket = days.find((d) => d.dayKey === day);
    if (!bucket) return;
    if (target === 'me') {
      bucket.protein += rec.items.reduce((s, i) => s + (i.p ?? 0), 0);
      bucket.carbs += rec.items.reduce((s, i) => s + (i.c ?? 0), 0);
      bucket.fat += rec.items.reduce((s, i) => s + (i.f ?? 0), 0);
      bucket.calories += rec.totalCalories;
    } else {
      bucket.partnerCalories += rec.totalCalories;
    }
  };

  for (const r of records) fillDay(r, 'me');
  if (secondary) for (const r of secondary) fillDay(r, 'partner');

  return days;
}

function computeDomain(data: DayDatum[]): { max: number } {
  let max = 0;
  for (const d of data) {
    const stacked = d.calories + d.partnerCalories;
    if (stacked > max) max = stacked;
  }
  // Round up to a "nice" 250 step so the axis doesn't end at 1847.
  const step = 250;
  return { max: Math.max(500, Math.ceil((max * 1.1) / step) * step) };
}

function formatTickDate(value: number): string {
  const d = new Date(value);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function CaloriesTooltip(props: TooltipProps<number, string>) {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  const d = new Date(label as number);
  const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
  const datum = (payload[0]!.payload as DayDatum) ?? null;
  return (
    <div className="rounded-lg border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-elevated))] px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-[rgb(var(--fg-primary))]">{dateLabel}</div>
      {datum ? (
        <>
          <div className="flex items-center gap-2 text-[rgb(var(--fg-primary))]">
            <span className="font-semibold">{Math.round(datum.calories)} kcal</span>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2 text-[10px] text-[rgb(var(--fg-secondary))]">
            <span>P {Math.round(datum.protein)}g</span>
            <span>C {Math.round(datum.carbs)}g</span>
            <span>F {Math.round(datum.fat)}g</span>
          </div>
          {datum.partnerCalories > 0 ? (
            <div className="mt-1 border-t border-[rgb(var(--border-default))] pt-1 text-[rgb(var(--fg-secondary))]">
              伙伴 {Math.round(datum.partnerCalories)} kcal
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
