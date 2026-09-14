# MealCard

> 🆕 需新增 — 路径 `src/components/ui/MealCard.tsx`。PF-4 饮食录入 + Home 饮食模块用。

## 用途

单条饮食记录的卡片(AI 估算结果 / 手动输入结果)。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `items` | `Array<{ name: string; emoji?: string; calories: number; p?: number; c?: number; f?: number }>` | — | 食物条目 |
| `totalCalories` | `number` | — | 总卡路里 |
| `recordedAt` | `Date` | — | 记录时间 |
| `source` | `'voice' \| 'manual'` | — | 来源(影响 icon 显示) |
| `aiConfidence` | `number` | — | AI 置信度 0-1,> 0.6 显示 "AI estimate" |
| `editable` | `boolean` | `true` | 允许编辑(点开进入编辑态) |
| `onEdit` | `() => void` | — | 编辑回调 |
| `className` | `string` | — | 容器样式 |

## 视觉

- 容器:`<Card raised>`。
- 顶部:`flex items-center justify-between`,左侧时间(`text-xs text-fg-muted`,如 "13:24 · voice")+ 右侧 source icon(`<Mic />` 或 `<Keyboard />`)。
- 条目列表:每行 `<div>` `flex items-center justify-between`,左侧 emoji + name,右侧 kcal(`text-sm font-medium`)。
- 营养素条:蛋白 / 碳水 / 脂肪,3 段迷你 progress bar(横向并列)。
- 总卡路里:`mt-3 pt-3 border-t border-[rgb(var(--border-default))]`,左侧 "Total",右侧"`{n} kcal`" 24px bold。
- AI 估算标签:`text-xs text-fg-muted`,带 `<Sparkles />` icon。置信度 < 0.6 时显示 "Edit estimate" 链接。

## 状态

- **default / hover**(可编辑时加 `pf-press` + shadow-md)/ **expanded**(编辑态,显示 inline editor)/ **loading**(删除时 spinner)。

## 例子

```tsx
<MealCard
  items={[
    { name: 'Chicken rice', emoji: '🍗', calories: 550, p: 30, c: 70, f: 18 },
    { name: 'Milk tea', emoji: '🥤', calories: 250, p: 6, c: 50, f: 8 },
  ]}
  totalCalories={800}
  recordedAt={new Date()}
  source="voice"
  aiConfidence={0.82}
  onEdit={() => openEditor()}
/>
```

## 可访问性

- 时间用 `<time dateTime={recordedAt.toISOString()}>` 语义标签。
- AI 估算标签 `aria-label="AI estimate, 82% confident"`。
- 可编辑时,整卡 `role="button"` 或包 `<button>`,tab index 0。