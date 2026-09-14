# ProgressCard

> 🆕 需新增 — 路径 `src/components/ui/ProgressCard.tsx`。PF-3 Home 用,替换 PF-1 内联的 `ProgressCard`(Home.tsx 里)。

## 用途

"你 / ta" 双卡展示今日 / 本周进度。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `accent` | `'brand' \| 'accent'` | `'brand'` | 你 / ta |
| `title` | `string` | — | "Your progress" / "Partner's progress" |
| `current` | `string \| number` | — | 当前值(渲染为 `3xl font-bold`) |
| `target` | `string \| number` | — | 目标值 |
| `unit` | `string` | — | `kg` / `kcal` / `min` |
| `percent` | `number` | — | 0-100 |
| `hint` | `string` | — | 下方灰色提示(空态友好) |
| `emoji` | `string` | — | 右上图标(emoji) |
| `className` | `string` | — | 容器样式 |

## 视觉

- 容器:`<Card raised>`(12px 圆角,sm 阴影)。
- 顶部:`flex items-start justify-between`,左侧标题 + 数字,右侧 40px 圆背景 emoji icon(`bg-brand-100` 或 `bg-accent-100`)。
- 数字:`text-3xl font-bold tracking-tight`(30px),右侧小一号 `/ target`(muted)。
- 进度条:`mt-4`,`<ProgressBar accent={accent} size="md" />`。
- hint:`mt-3 text-xs text-fg-subtle`。

## 状态

- **default / animating**(percent 变化)/ **empty**(percent 0,hint 显示"Set a goal to start tracking")。

## 例子

```tsx
<div className="grid gap-4 sm:grid-cols-2">
  <ProgressCard
    accent="brand"
    title="Your progress"
    current="0.5"
    target="1.5"
    unit="kg"
    percent={33}
    hint="On track for this week's goal"
    emoji="📉"
  />
  <ProgressCard
    accent="accent"
    title="Partner's progress"
    current="2.1"
    target="3.0"
    unit="km"
    percent={70}
    hint="2 days streak — keep it up!"
    emoji="📈"
  />
</div>
```

## 可访问性

- 标题用 `<h3>`(语义层级正确)。
- 数字 + 单位合在一起,SR 读作"零点五公斤"。
- 进度条 `role="progressbar"` + `aria-label`。

## 与 PF-1 内联实现的差异

- PF-1 在 `Home.tsx` 里有个 `ProgressCard` 内联组件,**只有 static 样式**,无 props、无动画。
- 本规格把它抽到 `src/components/ui/ProgressCard.tsx`,接受 props 并用 `<ProgressBar>` 子组件。
- 迁移:`Home.tsx` 里 import 改为 `import { ProgressCard } from '../components/ui/ProgressCard'`。