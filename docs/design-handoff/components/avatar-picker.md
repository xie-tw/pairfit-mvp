# AvatarPicker

> PF-1 已实现(`src/components/ui/AvatarPicker.tsx`)。

## 用途

头像选择器 — 16 个 emoji + 1 个 initial fallback。MVP 不上传照片。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `value` | `string` | — | 当前选中(emoji 或 `''` 表示 initial)|
| `fallbackInitial` | `string` | — | 当 `value === ''` 时显示的首字母 |
| `onChange` | `(next: string) => void` | — | 选中新 emoji 或 `''` |
| `className` | `string` | — | 容器样式 |

## 视觉

- 容器:`flex flex-wrap gap-2`,`role="radiogroup"`。
- 选中态:`border-brand-500 bg-brand-100 ring-2 ring-brand-500/30`(暗色下 `dark:bg-brand-500/20`)。
- 未选中:`border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))]`,hover 切 `bg-sunken`。

## Emoji 目录

```
🐶 🐱 🦊 🐼 🐯 🦁 🐸 🐵 🐰 🐨 🦄 🐙 🐳 🐢 🍀 🌸
```

(见 `design-tokens.json → imagery.emojiCatalog`)

## 状态

- **default / hover / selected**:均已实现。
- 没有 disabled / loading — 头像选择永远是允许的。

## 例子

```tsx
<AvatarPicker
  value={user.avatar}
  fallbackInitial={(user.displayName.trim()[0] ?? 'P').toUpperCase()}
  onChange={(next) => updateProfile({ avatar: next })}
/>
```

## 可访问性

- 容器 `role="radiogroup"`,每个 emoji 是 `role="radio"`,`aria-checked` 跟随选中态。
- emoji 本身 `aria-hidden`(emoji 不需要 SR 朗读)。
- 键盘:`Tab` 进入,`←` `→` 切换,`Enter` / `Space` 确认。

## 何时用 / 何时不用

**用**:
- 注册时选头像(可选)。
- Profile 页改头像。

**不用**:
- 情侣绑定页(用 emoji 评论即可,不用 AvatarPicker)— 见 `couple-ribbon.md`。