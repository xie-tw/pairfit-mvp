# WorkoutCard

> 🆕 需新增 — 路径 `src/components/ui/WorkoutCard.tsx`。PF-5 运动录入 + Home 运动模块用。

## 用途

单条运动记录的卡片。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `type` | `'running' \| 'cycling' \| 'swimming' \| 'strength' \| 'yoga' \| 'walking' \| 'other'` | — | 运动类型 |
| `durationMin` | `number` | — | 时长(分钟) |
| `intensity` | `'low' \| 'medium' \| 'high'` | — | 强度 |
| `estimatedCalories` | `number` | — | 估算消耗(基于 type + duration + intensity) |
| `recordedAt` | `Date` | — | 记录时间 |
| `source` | `'voice' \| 'manual'` | — | 来源 |
| `editable` | `boolean` | `true` | — |
| `onEdit` | `() => void` | — | — |

## 视觉

- 容器:`<Card raised>`。
- 顶部:`flex items-center gap-3`,左侧 40px 圆背景运动 emoji(根据 type 选):
  - `running` 🏃 / `cycling` 🚴 / `swimming` 🏊 / `strength` 💪 / `yoga` 🧘 / `walking` 🚶 / `other` 🏋️
- 右侧:`type`(16px semibold,本地化为 "Running / 跑步")+ 时长(`{durationMin} min` 14px muted)。
- 中部:强度 chip(`<Badge variant="success|warning|danger">Low / Med / High</Badge>`)。
- 底部:`flex justify-between`,左侧 source + 时间,右侧 `-{estimatedCalories} kcal`(danger 色,因为是消耗)。
- 如果是 voice:source icon `<Mic />` + transcript 灰色小字"I said: ran 30 minutes"。

## 强度 chip 颜色

| intensity | badge variant | 备注 |
|---|---|---|
| `low` | success | 绿色,温和 |
| `medium` | warning | 黄色,中等 |
| `high` | danger | 红色,高强度 |

## 例子

```tsx
<WorkoutCard
  type="running"
  durationMin={30}
  intensity="medium"
  estimatedCalories={300}
  recordedAt={new Date()}
  source="voice"
/>
```

## 可访问性

- 估算消耗用 `<span aria-label="estimated 300 kilocalories burned">-300 kcal</span>`。
- 强度 chip 加 `aria-label="Medium intensity"`。