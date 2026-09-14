import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import type { WeightRecord } from '../../store/weight';
import type { CurvePoint } from '../../store/goal';
import { toKg, fromKg } from '../../lib/units';
import type { Unit } from '../../store/auth';
import { cn } from '../../lib/utils';

/**
 * WeightChart — single line for actual readings + dashed reference line
 * for the goal curve. Both lines are drawn in *kilograms* internally and
 * the axis is converted to the user's display unit on the way out, so
 * mixing kg / lb entries never causes weird jumps.
 *
 * Empty state: render an empty Card with an "add your first reading"
 * message instead of an empty chart — Recharts inside a 0-height
 * ResponsiveContainer throws a runtime warning.
 */
export interface WeightChartProps {
  records: WeightRecord[];
  /** Projected goal curve (output of `projectGoalCurve`). May be `null` if no goal set. */
  goalCurve?: CurvePoint[] | null;
  goalWeight?: number | null;
  /** Display unit for the Y axis. Records are normalized to kg internally. */
  unit: Unit;
  /** Window length in days. Defaults to 30. */
  windowDays?: number;
  className?: string;
  /** Hide the goal reference line / target line — useful for the "no goal" state. */
  hideGoal?: boolean;
}

interface ChartDatum {
  /** Unix ms at the *start* of the day the reading belongs to. */
  dayKey: number;
  /** Weight in the user's display unit. */
  weight: number | null;
  /** Projected weight for that day, in the user's display unit. */
  target: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function WeightChart({
  records,
  goalCurve,
  goalWeight,
  unit,
  windowDays = 30,
  className,
  hideGoal = false,
}: WeightChartProps) {
  const { t } = useTranslation();
  const data = useMemo(() => buildSeries(records, goalCurve, unit, windowDays), [
    records,
    goalCurve,
    unit,
    windowDays,
  ]);

  // Compute a sensible Y domain that hugs the data but leaves room for the
  // goal reference line. Without padding the goal line could sit on the
  // top/bottom edge of the chart.
  const { min, max } = useMemo(() => computeDomain(data, goalWeight, unit), [data, goalWeight, unit]);
  const goalReference = goalWeight !== null && goalWeight !== undefined
    ? fromKg(toKg(goalWeight, unit === 'kg' ? 'kg' : 'lb'), unit)
    : null;

  if (data.every((d) => d.weight === null && d.target === null)) {
    return (
      <div
        className={cn(
          'flex h-48 items-center justify-center rounded-xl border border-dashed border-[rgb(var(--border-default))] text-sm text-[rgb(var(--fg-secondary))]',
          className,
        )}
      >
        <span>{t('trends.emptyChart')}</span>
      </div>
    );
  }

  return (
    <div className={cn('h-48 w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
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
            domain={[min, max]}
            tickFormatter={(v: number) => v.toFixed(unit === 'kg' ? 1 : 0)}
            stroke="rgb(var(--fg-subtle))"
            tick={{ fontSize: 11 }}
            width={36}
            tickLine={false}
            axisLine={false}
            unit={unit === 'kg' ? ' kg' : ' lb'}
          />
          {!hideGoal && goalReference !== null ? (
            <ReferenceLine
              y={goalReference}
              stroke="rgb(var(--brand-rgb, 255 107 107))"
              strokeDasharray="6 4"
              strokeOpacity={0.6}
              label={{
                value: t('trends.seriesGoal'),
                position: 'right',
                fill: 'rgb(var(--fg-secondary))',
                fontSize: 10,
              }}
              ifOverflow="extendDomain"
            />
          ) : null}
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: 'rgb(var(--fg-subtle))', strokeDasharray: '3 3' }} />
          {!hideGoal ? (
            <Line
              type="monotone"
              dataKey="target"
              stroke="rgb(var(--brand-rgb, 255 107 107))"
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeOpacity={0.55}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
              name={t('trends.seriesGoal')}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="rgb(var(--brand-rgb, 255 107 107))"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'rgb(var(--brand-rgb, 255 107 107))', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive
            animationDuration={400}
            name={t('trends.seriesWeight')}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildSeries(
  records: WeightRecord[],
  goalCurve: CurvePoint[] | null | undefined,
  unit: Unit,
  windowDays: number,
): ChartDatum[] {
  const today = startOfDay(Date.now());
  const startDay = today - (windowDays - 1) * MS_PER_DAY;
  const days: number[] = [];
  for (let i = 0; i < windowDays; i += 1) days.push(startDay + i * MS_PER_DAY);

  // Bucket readings by start-of-day so multiple readings per day collapse
  // to the latest one — keeps the line honest (we don't draw two dots on
  // the same X tick).
  const buckets = new Map<number, WeightRecord>();
  for (const r of records) {
    const day = startOfDay(r.recordedAt);
    if (day < startDay || day > today) continue;
    const prev = buckets.get(day);
    if (!prev || r.recordedAt > prev.recordedAt) buckets.set(day, r);
  }

  const targetByDay = new Map<number, number>();
  if (goalCurve) {
    for (const p of goalCurve) {
      const day = startOfDay(p.date);
      if (day < startDay || day > today) continue;
      targetByDay.set(day, p.weight);
    }
  }

  return days.map((dayKey) => {
    const r = buckets.get(dayKey);
    const target = targetByDay.get(dayKey);
    return {
      dayKey,
      weight: r ? fromKg(toKg(r.weight, r.unit), unit) : null,
      target: target !== undefined ? fromKg(toKg(target, unit), unit) : null,
    };
  });
}

function computeDomain(
  data: ChartDatum[],
  goalWeight: number | null | undefined,
  unit: Unit,
): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const d of data) {
    if (d.weight !== null) {
      if (d.weight < min) min = d.weight;
      if (d.weight > max) max = d.weight;
    }
    if (d.target !== null) {
      if (d.target < min) min = d.target;
      if (d.target > max) max = d.target;
    }
  }
  if (goalWeight !== null && goalWeight !== undefined) {
    const g = fromKg(toKg(goalWeight, unit === 'kg' ? 'kg' : 'lb'), unit);
    if (g < min) min = g;
    if (g > max) max = g;
  }
  if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1 };
  // Pad the range by 8% on each side so the line doesn't kiss the edges.
  const pad = Math.max((max - min) * 0.12, 0.5);
  return { min: round(min - pad, unit), max: round(max + pad, unit) };
}

function round(value: number, unit: Unit): number {
  const step = unit === 'kg' ? 0.5 : 1;
  return Math.round(value / step) * step;
}

function formatTickDate(value: number): string {
  const d = new Date(value);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function ChartTooltip({ active, payload, label, unit }: TooltipProps<number, string> & { unit: Unit }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = new Date(label as number);
  const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
  return (
    <div className="rounded-lg border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-elevated))] px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-[rgb(var(--fg-primary))]">{dateLabel}</div>
      {payload.map((p) => (
        <div key={p.dataKey as string} className="flex items-center gap-2 text-[rgb(var(--fg-secondary))]">
          <span
            aria-hidden
            className="inline-block size-2 rounded-full"
            style={{ background: p.color }}
          />
          <span>
            {p.name}: {p.value !== null && p.value !== undefined ? `${(p.value as number).toFixed(1)} ${unit}` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}
