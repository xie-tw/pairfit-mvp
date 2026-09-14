# Input

> PF-1 已实现(`src/components/ui/Input.tsx`)。

## 用途

表单输入框。文字 / 邮箱 / 密码 / 数字都走这个组件。带 label + hint + error 三段式。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `label` | `ReactNode` | — | 必填,标签上方 |
| `hint` | `string` | — | 字段下方灰色提示(如 "至少 8 位") |
| `error` | `string` | — | 字段下方红色错误 |
| `leadingIcon` | `ReactNode` | — | 左侧 icon(16px, lucide) |
| `trailingIcon` | `ReactNode` | — | 右侧 icon |
| `labelTrailing` | `ReactNode` | — | 标签右侧内容(如 "Forgot?" 链接) |
| `containerClassName` | `string` | — | 容器样式 |
| `...rest` | `InputHTMLAttributes` | — | 含 `type`、`autoComplete`、`placeholder` |

## 视觉

- 默认 40px 高,12px 水平 padding,8px 圆角。
- 边框 1px,`focus-within` 时变 `brand-500`,加 3px 透明 ring(`box-shadow: 0 0 0 3px rgb(255 107 107 / 0.20)`)。
- 错误态:边框 `danger`,错误文案 `<p role="alert">`。
- disabled:opacity 60,cursor not-allowed。

## 状态

- **default / hover / focus / disabled / error**:均已实现。
- **aria-invalid="true"** + **aria-describedby** 自动绑定(指向 hint 或 error 元素的 id)。

## 例子

```tsx
<Input
  label="Email"
  type="email"
  inputMode="email"
  autoComplete="email"
  placeholder="you@example.com"
  leadingIcon={<AtSign className="size-4" />}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  error={fieldError('email')}
/>

<Input
  label="Password"
  type="password"
  autoComplete="current-password"
  leadingIcon={<KeyRound className="size-4" />}
  labelTrailing={
    <Link to="/forgot-password" className="text-xs text-brand-600">
      Forgot?
    </Link>
  }
  hint="At least 8 characters, with a letter and a digit."
  error={fieldError('password')}
/>
```

## 可访问性

- label 永远显示(非 placeholder-only)— 这是 A11y 硬规则。
- error 文案 `role="alert"`,SR 会立即播报。
- focus 自动滚到首个错误字段(由 page-level 逻辑实现,不在本组件)。
- 数字字段加 `inputMode="numeric"`(移动端弹数字键盘);邮箱加 `inputMode="email"`。

## 注意事项

- 不要用 Input 做"搜索框"— 搜索框应该有自己的 SearchBox 组件(PF-8 trends 过滤用)。
- 不要给 Input 加 `onKeyDown` 来阻止空格 — 这会破坏 SR 输入。