# SegmentedControl

> 🆕 需抽公共组件 — Profile 与 Me 各有一份内联实现,需要统一抽到 `src/components/ui/SegmentedControl.tsx`。PF-9 完成。

## 用途

2-3 个互斥选项的紧凑切换(单位 / 语言 / 主题)。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `value` | `T` | — | 当前选中值(泛型,约束为 string) |
| `onChange` | `(next: T) => void` | — | 选中新值 |
| `options` | `Array<{ value: T; label: string; icon?: ReactNode }>` | — | 选项列表(2-4 项,多了就用 `Tabs`) |
| `size` | `'sm' \| 'md'` | `'md'` | 容器高 32 / 40 px |
| `className` | `string` | — | 容器样式 |

## 视觉

- 容器:`inline-flex w-full rounded-lg bg-sunken p-1`。
- 单项:`flex-1 rounded-md px-3 py-1.5 text-sm font-medium`。
- 选中:`bg-surface text-fg-primary shadow-sm`。
- 未选:`text-fg-muted hover:text-fg-primary`。

## 例子

```tsx
<SegmentedControl<'kg' | 'lb'>
  value={unit}
  onChange={setUnit}
  options={[
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'lb', label: 'Pounds (lb)' },
  ]}
/>

<SegmentedControl<'en' | 'zh'>
  value={locale}
  onChange={setLocale}
  options={[
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
  ]}
/>

<SegmentedControl<'light' | 'dark' | 'system'>
  value={mode}
  onChange={setMode}
  options={[
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ]}
/>
```

## 可访问性

- 容器 `role="radiogroup"`。
- 每个选项 `role="radio" aria-checked={selected}`。
- 键盘:`Tab` 进入组,`←` `→` 切换,`Enter` / `Space` 确认。
- 选中项 `aria-checked="true"`。

## 何时用 / 何时不用

**用**:
- 2-4 个互斥选项。
- 选项 label 短(1-3 词)。
- 切换后立即生效。

**不用**:
- ≥ 5 个选项 → 用 `Tabs`。
- 选项是路径跳转 → 用 `NavLink`。
- 选项是"打开 / 关闭"独立开关 → 用 `Switch`。