# Button

> PF-1 已实现(`src/components/ui/Button.tsx`)。本规格与现有实现兼容,只补充用法。

## 用途

通用按钮。表单提交 / 主 CTA / 次 CTA / 危险操作都走这个组件,不要自己造 `<button>`。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'outline' \| 'accent' \| 'danger'` | `'primary'` | 视觉档位 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 高 32 / 40 / 48 px |
| `leadingIcon` | `ReactNode` | — | 前置 icon(lucide, 16px)|
| `trailingIcon` | `ReactNode` | — | 后置 icon |
| `block` | `boolean` | `false` | `w-full`,适合全宽场景 |
| `loading` | `boolean` | `false` | 显示 spinner,禁用交互,加 `aria-busy` |
| `disabled` | `boolean` | `false` | 标准 disabled |
| `...rest` | `ButtonHTMLAttributes` | — | 含 `type`,默认 `type="button"`(避免表单意外提交) |

## 用法档位矩阵

| 场景 | variant | size | block | 例子 |
|---|---|---|---|---|
| 表单提交 | `primary` | `lg` | ✓ | 注册 / 登录 / 保存 |
| 主 CTA(浮于卡片下方) | `primary` | `lg` | ✓ | "开始记录" / "下一步" |
| 次要操作 | `secondary` | `md` | — | "跳过" / "再想想" |
| 文本链接 | `ghost` | `md` | — | "取消" / "以后再说" |
| 强调 ta 的操作 | `accent` | `md` | — | 鼓励 / 确认对方记录 |
| 危险操作 | `danger` | `lg` | ✓ | "退出登录" / "清空数据" |

## 状态

- **default / hover / active / focus / disabled / loading**:均已实现于 PF-1。
- **loading**:spinner 替换 leadingIcon;button 不可点击;`aria-busy="true"`。
- **active**:scale 0.98(`pf-press` 类)— 100ms 内必须有,可点击反馈。

## 例子

```tsx
<Button variant="primary" size="lg" block type="submit">
  Create account
</Button>

<Button
  variant="primary"
  size="lg"
  block
  loading={submitting}
  disabled={submitting}
>
  {submitting ? 'Signing in…' : 'Sign in'}
</Button>

<Button variant="danger" size="lg" block leadingIcon={<LogOut />}>
  Sign out
</Button>
```

## 可访问性

- 默认 `type="button"`,不会误触发表单提交。
- loading 时 `aria-busy="true"`,SR 会播报"busy"。
- 所有 icon-only 按钮必须有 `aria-label`。
- focus ring 已由 `tailwind.config.ts → boxShadow.glow` 全局应用。