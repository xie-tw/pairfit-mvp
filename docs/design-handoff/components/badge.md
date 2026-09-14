# Badge

> 🆕 需抽公共组件 — 当前在 `Me.tsx` 里内联,需要抽到 `src/components/ui/Badge.tsx`。

## 用途

小标签 / chip。状态指示 / 计数 / 角标。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `variant` | `'neutral' \| 'brand' \| 'accent' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'gradient'` | `'neutral'` | 视觉档位 |
| `size` | `'sm' \| 'md'` | `'md'` | 高 18 / 22 px |
| `icon` | `ReactNode` | — | 前置 icon(12-14px) |
| `children` | `ReactNode` | — | 文字 / emoji |
| `className` | `string` | — | 容器样式 |

## 视觉

### variant 颜色

| variant | bg | fg | border |
|---|---|---|---|
| `neutral` | `bg-sunken` | `fg-secondary` | `border-default` |
| `brand` | `bg-brand-100` (dark: `bg-brand-500/15`) | `text-brand-600` (dark: `text-brand-300`) | — |
| `accent` | `bg-accent-100` (dark: `bg-accent-500/15`) | `text-accent-600` (dark: `text-accent-300`) | — |
| `success` | `bg-success-soft` | `text-success-foreground` | — |
| `warning` | `bg-warning-soft` | `text-warning-foreground` | — |
| `danger` | `bg-danger-soft` | `text-danger-foreground` | — |
| `info` | `bg-info-soft` | `text-info-foreground` | — |
| `gradient` | `bg-gradient-to-r from-brand-500 to-accent-500` | `text-white` | — |

### 尺寸

- `sm`:`text-[11px] px-2 py-0.5 rounded-full`
- `md`:`text-xs px-2.5 py-1 rounded-full`

## 例子

```tsx
<Badge variant="gradient">Pro</Badge>
<Badge variant="brand" icon={<Flame className="size-3" />}>Streak 12</Badge>
<Badge variant="warning">High intensity</Badge>
<Badge variant="neutral">Free tier</Badge>
```

## 与 `pf-chip` 的关系

`pf-chip`(已在 `src/index.css`)用于"列表项小标签 / 语言切换指示",纯文本 + 边框,无 icon。

`Badge` 用于"状态指示 / 强调"(Pro / 高强度 / 成功 / 错误),可带 icon + 着色。

两者用途不重叠,不要混用。

## 可访问性

- 仅装饰性 → `aria-hidden`。
- 状态指示(成功 / 警告 / 错误)→ 文字本身已说明,不需额外 aria。
- 数字计数(如 Coins +10)→ `aria-label="10 coins added"`,文字不要只是 "+10"。