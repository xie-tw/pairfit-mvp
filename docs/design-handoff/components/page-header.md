# PageHeader

> PF-1 已实现(`src/components/ui/PageHeader.tsx`)。

## 用途

每个页面的标准 header(标题 + 副标题 + 右侧操作)。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `title` | `string` | — | 必填,主标题 |
| `subtitle` | `string` | — | 副标题(灰色,1 行) |
| `trailing` | `ReactNode` | — | 右侧操作(chip / 按钮) |
| `className` | `string` | — | 容器样式 |

## 视觉

- 标题:`text-2xl font-bold tracking-tight`(24px / 700),`sm:text-3xl`(30px / 700 ≥ 640px)。
- 副标题:`text-sm text-fg-muted`,`mt-1`。
- 容器:`mb-6 flex items-end justify-between gap-3`。
- 整页上下 padding:`pt-4 sm:pt-6`,由 AppShell 提供。

## 状态

无状态组件,纯展示。

## 例子

```tsx
<PageHeader
  title="Hi, partner"
  subtitle="Today's plan for both of you."
  trailing={
    <button className="pf-press inline-flex items-center gap-1.5 rounded-full ...">
      <Flame className="size-3.5 text-brand-500" />
      <span>Streak</span>
    </button>
  }
/>
```

## 何时用 / 何时不用

**用**:
- 每个 tab / 子页面顶部。
- 标题 + 1 句副标题的场景。

**不用**:
- 表单页(用 AuthLayout,自带标题区)。
- Modal / BottomSheet(自带标题区)。
- 嵌入卡片的小标题(用 `pf-section-title` 类)— 见 design-tokens。

## 可访问性

- 用 `<header>` 语义标签。
- 标题用 `<h1>`,SR 知道这是页面起点。