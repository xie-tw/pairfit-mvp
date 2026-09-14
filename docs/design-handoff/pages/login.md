# Page · Login

> 路由:`/login` · 权限:公开 · 当前实现:`src/pages/Login.tsx`(PF-2)

## 目的

老用户登录。邮箱 + 密码,成功后回到来源页(`/profile` 或 `/`)。

## 布局

```
┌──────────────────────────────┐
│  [顶部安全区]                  │
│                              │
│  ╭──────╮                    │
│  │  PF  │                    │
│  ╰──────╯                    │
│                              │
│  Welcome back                │ ← h1
│  Sign in to keep your        │ ← p
│  streak going.               │
│                              │
│  ╭──────────────────────────╮│
│  │ Email           *        ││
│  │ [icon] [input        ]   ││ ← 自动聚焦
│  │                          ││
│  │ Password   *   [Forgot?] ││ ← labelTrailing
│  │ [icon] [input        ]   ││
│  ╰──────────────────────────╯│
│                              │
│  [server error · if]         │
│                              │
│  ╭──────────────────────────╮│
│  │   Sign in                ││ ← loading 态 "Signing in…"
│  ╰──────────────────────────╯│
│                              │
│  No account yet? Create one  │
│                              │
│  (disclaimer)                │
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| 品牌标识 + H1 + 副标题 | AuthLayout |
| Email 输入 | `<Input type="email" autoComplete="email">` |
| Password 输入 | `<Input type="password" autoComplete="current-password">` 带 labelTrailing `<Link to="/forgot-password">Forgot?</Link>` |
| 主 CTA | `<Button variant="primary" size="lg" block loading>` |
| Footer 链接 | "No account yet? Create one" → /register |

## 交互

| 操作 | 行为 |
|---|---|
| 进入页面 | 自动 focus email 字段 |
| 已登录访问 | 自动 navigate 回来源页 |
| 提交 | 校验 → 异步登录 → 成功 navigate(`fromState ?? '/'`, replace)→ 失败 serverError |
| Forgot? 链接 | navigate(/forgot-password) |
| Create one 链接 | navigate(/register) |

## 异常态

| 状态 | UI |
|---|---|
| **空** | 字段空,CTA 可点 |
| **错误 — required** | 字段下方红字 |
| **错误 — 邮箱格式** | "That email address doesn't look right." |
| **错误 — 凭据错** | server error alert "Email or password is incorrect." |
| **成功 loading** | CTA spinner,不可编辑 |

## i18n

| key (en/zh) |
|---|
| `auth.login.{title,subtitle,submit,submitting,noAccount,signUpLink}` |
| `auth.forgot` |
| `auth.errors.{required,invalid,email,password,emailTaken,invalidCredentials}` |

## 性能 / 可访问性

- 首屏 < 1s。
- 自动 focus email(`useEffect emailRef.current?.focus()`)— 给键鼠用户和 SR 用户都好。
- `from` router state 用于登录后跳回,刷新页面时 state 丢失,fallback 到 `/`。