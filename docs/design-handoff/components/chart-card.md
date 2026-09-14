# ChartCard

> 🆕 需新增 — 路径 `src/components/ui/ChartCard.tsx`。PF-8 Trends 用。

## 用途

图表容器。承载 Recharts 的折线 / 柱状 / 面积图。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `title` | `string` | — | 图表标题 |
| `subtitle` | `string` | — | 副标题(单位 / 时间窗) |
| `window` | `'7d' \| '30d' \| '90d'` | — | 时间窗(若启用) |
| `onWindowChange` | `(w: '7d' \| '30d' \| '90d') => void` | — | 时间窗切换回调 |
| `data` | `unknown` | — | Recharts data(透传给内部 `<XChart>`) |
| `chartType` | `'line' \| 'bar' \| 'area'` | `'line'` | 图表类型 |
| `comparePartner` | `boolean` | `false` | 是否叠加 ta 的曲线(Pro 功能) |
| `aiSummary` | `string` | — | AI 周报文案(可选,显示在底部) |
| `empty` | `boolean` | `false` | 数据不足时空态 |
| `className` | `string` | — | 容器样式 |

## 视觉

- 容器:`<Card raised>`。
- 顶部:`flex items-center justify-between`,左侧 title + subtitle,右侧 `<SegmentedControl size="sm" options={[{value:'7d',label:'7D'},{value:'30d',label:'30D'},{value:'90d',label:'90D'}]}>`(3 选 1 时间窗)。
- 图表:`mt-4 h-48 sm:h-56`,Recharts `<ResponsiveContainer width="100%" height="100%">`。
- 颜色:你 = `brand-500`,ta = `accent-500`。
- AI 周报:`mt-4 pt-4 border-t`,左侧 `<Sparkles />` icon,文字 14px fg-muted。
- 空态:`<EmptyState emoji="📈" title="数据不足" description="再记录 {days - current} 天就能看到曲线。" />` 替换图表。

## 颜色

| accent | line stroke | fill (area) | dot fill |
|---|---|---|---|
| brand (你) | `stroke-brand-500` | `fill-brand-500/15` | `fill-brand-500` |
| accent (ta) | `stroke-accent-500` | `fill-accent-500/15` | `fill-accent-500` |

## 例子

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

<ChartCard
  title="Weight"
  subtitle="kg · last 7 days"
  window="7d"
  onWindowChange={(w) => setWindow(w)}
  data={weightData}
  chartType="line"
  comparePartner={isPro && partnerBound}
  aiSummary="You lost 0.5 kg this week — on track for your goal."
>
  <LineChart data={data}>
    <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
    <YAxis tickLine={false} axisLine={false} fontSize={11} domain={['auto', 'auto']} />
    <Tooltip />
    <Line type="monotone" dataKey="weight" stroke="rgb(255 107 107)" strokeWidth={2} dot={false} />
    {comparePartner && (
      <Line type="monotone" dataKey="partnerWeight" stroke="rgb(20 184 166)" strokeWidth={2} dot={false} />
    )}
  </LineChart>
</ChartCard>
```

## 可访问性

- 图表本身对 SR 不友好,必须有 `<table>` 替代视图(隐藏,`sr-only`)— Coding Agent 在 PF-8 写一个 `<ChartTable>` 渲染同数据。
- `aria-label` 在卡片上:`"Weight trend, last 7 days"`。
- 时间窗切换 `<SegmentedControl>` 自带 radiogroup 语义。