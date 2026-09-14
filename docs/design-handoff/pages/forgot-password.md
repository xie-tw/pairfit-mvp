# Page · ForgotPassword

> 路由:`/forgot-password` · 权限:公开 · 当前实现:`src/pages/ForgotPassword.tsx`(PF-2)

## 目的

用户忘记密码 → 输邮箱 → "我们发了重置链接"(MVP 是占位,不真发邮件)。

## 布局(2 段:输入态 + 已发送态)

### 输入态

```
┌──────────────────────────────┐
│                              │
│  ╭──────╮                    │
│  │  PF  │                    │
│  ╰──────╯                    │
│                              │
│  Reset your password         │
│  We'll email you a reset     │
│  link.                       │
│                              │
│  ╭──────────────────────────╮│
│  │ We'll email you a reset  ││ ← 解释段
│  │ link. Enter the email    ││
│  │ you used at signup.      ││
│  │                          ││
│  │ Email           *        ││
│  │ [icon] [input        ]   ││
│  ╰──────────────────────────╯│
│                              │
│  [error · if]                │
│                              │
│  ╭──────────────────────────╮│
│  │   Send reset link        ││
│  ╰──────────────────────────╯│
│                              │
│  Back to sign in             │
└──────────────────────────────┘
```

### 已发送态

```
┌──────────────────────────────┐
│                              │
│      ╭───────────╮           │
│      │   ✓(teal) │           │
│      ╰───────────╯           │
│                              │
│  Check your inbox            │ ← h2
│  If {email} matches an       │ ← p
│  account, a reset link is    │
│  on its way. (MVP: mock.)    │
│                              │
│  Back to sign in             │
└──────────────────────────────┘
```

## 元素清单

### 输入态

| 元素 | 组件 |
|---|---|
| 品牌标识 + H1 + 副标题 | AuthLayout |
| 解释段 | `<p>` 14px muted |
| Email 输入 | `<Input type="email">` |
| 主 CTA | `<Button variant="primary" size="lg" block loading leadingIcon={<Mail />}>` |
| Footer 链接 | "Back to sign in" |

### 已发送态

| 元素 | 组件 |
|---|---|
| 大 ✓ 图标 | `<div>` 48px 圆背景 `bg-accent-500/15 text-accent-600` |
| H2 | "Check your inbox" |
| 描述 | 显示已输入的邮箱 |
| 链接 | "Back to sign in" |

## 交互

| 操作 | 行为 |
|---|---|
| 提交 | 校验邮箱格式 → requestReset → 切换到已发送态(无论账号是否存在,**MVP 永远显示成功** — 防枚举) |
| 失败 — required | "This field is required." |
| 失败 — 邮箱格式 | "That email address doesn't look right." |
| 成功 | 切换到"Check your inbox"段;toast `info` "If {email} matches an account, a link is on its way." |

## i18n

| key |
|---|
| `auth.forgot.{title,subtitle,body,submit,submitting,sentTitle,sentBody,backToLogin}` |
| `auth.errors.{required,invalid}` |
| `auth.placeholders.email` |

## 性能 / 可访问性

- 切到已发送态用 280ms fade-in(`animate-fade-in`)。
- "Back to sign in" 链接带 `<Mail />` icon 的按钮隐藏。

## 已知限制

- MVP **不真发邮件** — 文案明确写"(MVP: this is a mock — no email is actually sent.)"。
- 不暴露用户是否注册(返回成功而非 "email not found",防枚举)。