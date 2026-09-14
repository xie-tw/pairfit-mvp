# Card

> PF-1 已实现(`src/components/ui/Card.tsx`)。

## 用途

通用卡片容器。承载一个语义块(账户信息 / 进度 / 列表项)。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `raised` | `boolean` | `false` | 启用 elevated 背景 + soft shadow |
| `noPadding` | `boolean` | `false` | 去掉默认 `p-4`,用于内嵌列表 |
| `leading` | `ReactNode` | — | header 左侧(图标 / avatar)|
| `trailing` | `ReactNode` | — | header 右侧(chevron / 按钮)|
| `title` | `ReactNode` | — | header 标题(16px / semibold) |
| `subtitle` | `ReactNode` | — | header 副标题(14px / muted) |
| `...rest` | `HTMLAttributes<HTMLDivElement>` | — | 含 `onClick`(整卡可点击场景) |

## 视觉

- 默认 `bg-[rgb(var(--bg-surface))]` + `border border-[rgb(var(--border-default))]` + `rounded-xl`(12px)+ `p-4`。
- `raised` 时背景切到 `bg-elevated`,加 `shadow-sm`。
- 暗色模式自动跟随(`bg-surface` / `bg-elevated` 在暗色下用深色 token)。

## 状态

- **default** / **hover**(若可点击,加 `shadow-md`)/ **active**(若可点击,`pf-press`)。
- 不支持 disabled / loading — 若整卡禁用,加 `opacity-60 cursor-not-allowed`。

## 例子

```tsx
// 普通卡
<Card>
  <p className="text-sm">Card body</p>
</Card>

// Raised + header + trailing CTA
<Card raised
  title="Subscription"
  subtitle="Free tier"
  trailing={<Button size="sm">Upgrade</Button>}
>
  <p className="text-xs text-fg-muted">Unlock Pro for both of you.</p>
</Card>

// 整卡可点击(列表项)
<Link to="/profile">
  <Card raised className="pf-press transition-shadow hover:shadow-md">
    {/* ... */}
  </Card>
</Link>

// 嵌入列表
<Card noPadding>
  <ul className="divide-y">
    <li className="px-4 py-3">Row 1</li>
    <li className="px-4 py-3">Row 2</li>
  </ul>
</Card>
```

## 可访问性

- 标题用 `<h3>`,SR 会读出标题层级。
- 若整卡可点击,外层用 `<a>` 或 `<Link>`,**不要**给 Card 自己加 `onClick` 但不包链接(SR 无法识别为链接)。
- 不要在 `title` 里塞 emoji icon — emoji 应当用单独的 `<span aria-hidden>`。