# Page · Trends

> 路由:`/trends` · 权限:RequireAuth · PF-8 实现

## 目的

三张曲线 + AI 周报。看"我这周 / 这月 / 这季度做到了吗"。

## 布局

```
┌──────────────────────────────┐
│  Trends                      │
│  Charts and streaks.         │
│                              │
│  ╭──────────────────────────╮│
│  │ This week       7D 30D 90D││ ← ChartCard · 体重
│  │ 7 active days      [pill] ││
│  │                          ││
│  │  [line chart]            ││
│  │  ────●────●───●─●        ││
│  ╰──────────────────────────╯│
│                              │
│  ╭────────╮ ╭────────╮       │
│  │ 🔥 Best│ │ 📊 Avg │       │ ← StatTile × 2
│  │ 12 days │ │1.8k kcal│       │
│  ╰────────╯ ╰────────╯       │
│                              │
│  ╭──────────────────────────╮│
│  │ Calories    7D 30D 90D   ││ ← ChartCard · 卡路里
│  │ [bar chart]              ││
│  ╰──────────────────────────╯│
│                              │
│  ╭──────────────────────────╮│
│  │ Workouts    7D 30D 90D   ││ ← ChartCard · 运动
│  │ [area chart]             ││
│  ╰──────────────────────────╯│
│                              │
│  ╭──────────────────────────╮│
│  │ ✨ AI weekly summary     ││ ← AI 周报
│  │ "你比上周多吃了 12%      ││
│  │  蛋白,继续!"            ││
│  ╰──────────────────────────╯│
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| PageHeader | `<PageHeader title="Trends"/>` |
| 体重曲线 | `<ChartCard title="Weight" window onWindowChange chartType="line">` |
| 卡路里曲线 | `<ChartCard title="Calories" chartType="bar">` |
| 运动曲线 | `<ChartCard title="Workouts" chartType="area">` |
| StatTile × 2 | Best streak + Avg week |
| AI 周报卡 | `<Card raised>` 含 `<Sparkles />` + 文案 |

## 交互

| 操作 | 行为 |
|---|---|
| 切换 7D / 30D / 90D | 重新拉数据 + 曲线重绘(500ms transition) |
| Pro 解锁后 | 体重曲线叠加 ta 的对比线(accent 色) |
| 点 StatTile | 跳详情(MVP 可只显示 toast)|

## 状态

| 状态 | UI |
|---|---|
| **<7 天数据** | 空态 "再记录 X 天就能看到曲线" + 倒计时 |
| **≥7 天数据** | 曲线渲染 |
| **Pro 解锁 + 已绑定** | 体重曲线叠加 ta |
| **数据加载中** | skeleton shimmer |
| **AI 周报生成中** | shimmer 文案 + spinner |
| **AI 周报失败** | 隐藏 AI 段,不影响曲线 |

## 异常态

| 状态 | UI |
|---|---|
| **数据完全为空** | EmptyState "记录第一条数据,我们就能给你画曲线" |
| **某模块完全无数据** | 该 ChartCard 显示空态,其他正常 |
| **时间窗切换失败** | 保持当前窗 + toast warning |

## i18n

| key |
|---|
| `trends.{title,subtitle}` |
| `trends.window.{7d,30d,90d}` |
| `trends.chart.{weight,calories,workouts,subtitle}` |
| `trends.stat.{bestStreak,avgWeek,activeDays}` |
| `trends.empty.{title,body}` |
| `trends.ai.{title,generating,empty,error}` |
| `trends.ai.body` (本地化为本地化建议,如 "你比上周多吃了 12% 蛋白") |

## A11y

- 每张图配 `<table>`(sr-only),列同样的日期 + 数值。
- 时间窗切换 SegmentedControl 自带 radiogroup。
- AI 周报用 `<article>` 语义,SR 知道这是文本块。