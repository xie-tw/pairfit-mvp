# StatTile

> 🆕 需新增 — 路径 `src/components/ui/StatTile.tsx`。PF-8 Trends 用,PF-3 Home 三模块也可用。

## 用途

紧凑的"指标 + 标签"小卡片,用于显示单一数字(总卡路里 / 平均运动时长 / 连续打卡天数)。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `icon` | `ReactNode` | — | lucide icon(20px) |
| `accent` | `'brand' \| 'accent' \| 'warning' \| 'info' \| 'success'` | `'brand'` | 图标圆背景色 |
| `label` | `string` | — | 上方小标签(12px, uppercase tracking) |
| `value` | `string \| number` | — | 主数字(20-24px font-bold) |
| `unit` | `string` | — | `kg` / `kcal` / `days` |
| `delta` | `{ value: string; positive: boolean }` | — | 可选,与上周/昨日对比 |
| `className` | `string` | — | 容器样式 |

## 视觉

- 容器:`<Card>`(无 raised)。
- 内部:`flex items-center gap-3`。
- 左侧 40px 圆背景 icon(同 ProgressCard 样式)。
- 右侧:`label`(12px uppercase tracking-wide muted)+ `value`(20-24px bold)+ `unit`(14px muted,跟在 value 后)。
- `delta`:`text-xs`,正 `text-success`,负 `text-danger`,前面 ↗ / ↘ 箭头。

## 例子

```tsx
<div className="grid gap-3 sm:grid-cols-3">
  <StatTile
    icon={<Flame />}
    accent="brand"
    label="Best streak"
    value={12}
    unit="days"
  />
  <StatTile
    icon={<Activity />}
    accent="accent"
    label="Avg. week"
    value="1,820"
    unit="kcal"
    delta={{ value: '+12%', positive: true }}
  />
  <StatTile
    icon={<CalendarDays />}
    accent="info"
    label="Active days"
    value={5}
    unit="/ 7"
  />
</div>
```

## 可访问性

- label + value 用 `<p>`,不是 div。
- delta 加 `aria-label="up 12 percent"` 之类的语义提示(SR 不要读 ↗)。