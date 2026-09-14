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
import type { ExerciseRecord, ExerciseType } from '../../store/exercise';
import { cn } from '../../lib/utils';

/**
 * ExerciseChart — daily workout minutes as bars, with a "by type" stacked
 * breakdown (running / cycling / strength / …) so the user can see at a
 * glance where their training volume went.
 *
 * Like CaloriesChart, the partner overlay (`secondary`) renders as a
 * translucent dashed bar so two timelines on one device stay readable.
 */

export interface ExerciseChartProps {
  records: ExerciseRecord[];
  windowDays: number;
  className?: string;
  secondaryRecords?: ExerciseRecord[] | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface DayDatum {
  dayKey: number;
  minutes: number;
  partnerMinutes: number;
  // Up to 4 buckets — anything past that collapses into "other" so the
  // stack stays a manageable 4 layers.
  running: number;
  cycling: number;
  strength: number;
  other: number;
}

const PRIMARY_TYPES: ExerciseType[] = ['running', 'cycling', 'strength'];

export function ExerciseChart({
  records,
  windowDays,
  className,
  secondaryRecords,
}: ExerciseChartProps) {
  const { t } = useTranslation();
  const data = useMemo(
    () => buildSeries(records, secondaryRecords ?? null, windowDays),
    [records, secondaryRecords, windowDays],
  );

  // Hooks must run unconditionally — the domain `useMemo` has to run
  // *before* any early return.
  const { max } = useMemo(() => computeDomain(data), [data]);

  if (data.every((d) => d.minutes === 0 && d.partnerMinutes === 0)) {
    return (
      <div
        className={cn(
          'flex h-48 items-center justify-center rounded-xl border border-dashed border-[rgb(var(--border-default))] text-sm text-[rgb(var(--fg-secondary))]',
          className,
        )}
      >
        <span>{t('trends.emptyExercise')}</span>
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
            width={36}
            tickLine={false}
            axisLine={false}
            unit=" min"
          />
          <Tooltip
            content={<ExerciseTooltip />}
            cursor={{ fill: 'rgb(var(--bg-sunken))', opacity: 0.4 }}
          />
          <Bar
            dataKey="running"
            stackId="me"
            fill="rgb(var(--brand-rgb, 255 107 107))"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
            name={t('exercise.typeLabels.running')}
          />
          <Bar
            dataKey="cycling"
            stackId="me"
            fill="#3B82F6"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
            name={t('exercise.typeLabels.cycling')}
          />
          <Bar
            dataKey="strength"
            stackId="me"
            fill="rgb(var(--accent-rgb, 20 184 166))"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
            name={t('exercise.typeLabels.strength')}
          />
          <Bar
            dataKey="other"
            stackId="me"
            fill="#A8A29E"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            name={t('trends.seriesOther')}
          />
          {secondaryRecords ? (
            <Bar
              dataKey="partnerMinutes"
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
  records: ExerciseRecord[],
  secondary: ExerciseRecord[] | null,
  windowDays: number,
): DayDatum[] {
  const today = startOfDay(Date.now());
  const startDay = today - (windowDays - 1) * MS_PER_DAY;
  const days: DayDatum[] = [];
  for (let i = 0; i < windowDays; i += 1) {
    days.push({
      dayKey: startDay + i * MS_PER_DAY,
      minutes: 0,
      partnerMinutes: 0,
      running: 0,
      cycling: 0,
      strength: 0,
      other: 0,
    });
  }

  const fill = (rec: ExerciseRecord, target: 'me' | 'partner') => {
    const day = startOfDay(rec.recordedAt);
    if (day < startDay || day > today) return;
    const bucket = days.find((d) => d.dayKey === day);
    if (!bucket) return;
    if (target === 'me') {
      bucket.minutes += rec.durationMin;
      if (PRIMARY_TYPES.includes(rec.type)) {
        bucket[rec.type] += rec.durationMin;
      } else {
        bucket.other += rec.durationMin;
      }
    } else {
      bucket.partnerMinutes += rec.durationMin;
    }
  };

  for (const r of records) fill(r, 'me');
  if (secondary) for (const r of secondary) fill(r, 'partner');

  return days;
}

function computeDomain(data: DayDatum[]): { max: number } {
  let max = 0;
  for (const d of data) {
    const stacked = d.minutes + d.partnerMinutes;
    if (stacked > max) max = stacked;
  }
  const step = 15;
  return { max: Math.max(30, Math.ceil((max * 1.15) / step) * step) };
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

function ExerciseTooltip(props: TooltipProps<number, string>) {
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
          <div className="text-[rgb(var(--fg-primary))]">
            <span className="font-semibold">{Math.round(datum.minutes)} min</span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-[rgb(var(--fg-secondary))]">
            {datum.running > 0 ? <span>跑步 {Math.round(datum.running)} min</span> : null}
            {datum.cycling > 0 ? <span>骑行 {Math.round(datum.cycling)} min</span> : null}
            {datum.strength > 0 ? <span>力量 {Math.round(datum.strength)} min</span> : null}
            {datum.other > 0 ? <span>其他 {Math.round(datum.other)} min</span> : null}
          </div>
          {datum.partnerMinutes > 0 ? (
            <div className="mt-1 border-t border-[rgb(var(--border-default))] pt-1 text-[rgb(var(--fg-secondary))]">
              伙伴 {Math.round(datum.partnerMinutes)} min
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
