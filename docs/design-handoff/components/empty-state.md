# EmptyState

> PF-1 已实现(`src/components/ui/EmptyState.tsx`)。

## 用途

每个列表 / 数据屏都需要一个空状态。空状态是设计 — 承担引导、教育、品牌印象三个任务。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `emoji` | `string` | — | 大 emoji(2xl = 24px),品牌目录见 design-tokens.json |
| `icon` | `ReactNode` | — | 自定义 icon(优先于 emoji) |
| `title` | `string` | — | 必填,1 句人话标题 |
| `description` | `string` | — | 解释 + 主 CTA 引导 |
| `action` | `ReactNode` | — | 主 CTA 按钮 |
| `className` | `string` | — | 容器样式 |

## 视觉

- 容器:`rounded-xl px-6 py-12`,虚线边 + `bg-sunken/60`。
- 圆背景:`size-14`(56px)圆形 icon,`bg-surface + shadow-sm`。
- 标题:`text-base font-semibold`。
- 描述:`text-sm text-fg-muted`,`max-w-xs`(防止拉太长)。
- CTA:`mt-4`。

## 三要素(必填)

1. **emoji / 图标**(大、圆背景、居中)
2. **标题**:"今天还没记录"(1 句,告诉用户"这里为什么空")
3. **描述 + CTA**:"记录第一条,我们就能给你画曲线。" + [记录体重]

不要写"暂无数据"、"暂无内容"。

## 例子

```tsx
// 列表空(无数据)
<EmptyState
  emoji="🎯"
  title="今天还没记录"
  description="记录第一条体重,我们就能给你画曲线。"
  action={
    <Button variant="primary" size="md">
      记录体重
    </Button>
  }
/>

// 占位(PF 暂未实现)
<EmptyState
  emoji="📈"
  title={t('common.comingSoon')}
  description="Detailed charts and partner comparison arrive in PF-7."
/>

// 自定义 icon
<EmptyState
  icon={<Heart className="size-6 text-brand-500" />}
  title="绑定你的伙伴"
  description="绑定后共享进度、虚拟币和挑战。"
  action={<Button variant="primary">生成邀请码</Button>}
/>
```

## 可访问性

- 标题用 `<h3>`(语义层级正确)。
- emoji / icon `aria-hidden`。
- CTA 按钮聚焦时 focus ring 正常。