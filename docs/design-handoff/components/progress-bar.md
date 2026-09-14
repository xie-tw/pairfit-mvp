# ProgressBar

> 🆕 需新增 — 路径 `src/components/ui/ProgressBar.tsx`。PF-3 Home 用。

## 用途

水平进度条(0-100%)。用于"今日打卡进度"和"目标达成进度"。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `value` | `number` | — | 当前值(0-100) |
| `accent` | `'brand' \| 'accent'` | `'brand'` | 你 / ta 的语义色 |
| `label` | `string` | — | 可选,显示在条上方(`0.5 / 1.0 kg`) |
| `showPercent` | `boolean` | `false` | 是否在条右端显示百分比 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 条高 4 / 8 / 12 px |
| `className` | `string` | — | 容器样式 |

## 视觉

- 容器:`h-<size> w-full overflow-hidden rounded-full bg-sunken`。
- 内部:`h-full rounded-full`,根据 `accent` 用 `bg-brand-500` 或 `bg-accent-500`。
- 过渡:`transition-all duration-500 ease-out-quart`(让数字变化平滑)。
- 标签:`text-xs text-fg-muted`,在条上方左对齐。
- 百分比:`text-xs font-semibold`,在条右端右对齐。

## 状态

- **default**:静态条,value 0-100。
- **animating**:value 变化时,宽度 transition 500ms。
- **striped**(可选,loading):加 `bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75,transparent)] animate-[shimmer_1s_linear_infinite]`。

## 例子

```tsx
// Home · 你
<ProgressBar
  value={40}
  accent="brand"
  size="lg"
  label="0.5 / 1.5 kg this week"
  showPercent
/>

// 趋势对比
<ProgressBar value={70} accent="accent" />
```

## 可访问性

- 容器 `role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}`。
- 当作为"今日打卡进度"用,加 `aria-label="Today's check-in progress"`。
- 不需要 `aria-live` — 进度变化频繁,SR 会一直播报;由 page-level 用 toast 播报"今日完成!"。