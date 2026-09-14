# Page · Register

> 路由:`/register` · 权限:公开 · 当前实现:`src/pages/Register.tsx`(PF-2)

## 目的

新用户创建账号。3 步搞定:填邮箱 + 密码 + 昵称 + 头像 → 校验 → 成功 → 跳 Onboarding。

## 布局(自上而下)

```
┌──────────────────────────────┐
│  [顶部安全区]                  │
│                              │
│  ╭──────╮                    │
│  │  PF  │  ← 品牌标识(48px) │
│  ╰──────╯                    │
│                              │
│  Create your account         │ ← h1 · 24px bold
│  Three steps and you're set. │ ← p · 14px muted
│                              │
│  ╭──────────────────────────╮│
│  │ Nickname        *        ││
│  │ [icon] [input        ]   ││
│  │                          ││
│  │ Email           *        ││
│  │ [icon] [input        ]   ││
│  │                          ││
│  │ Password        *        ││
│  │ [icon] [input        ]   ││
│  │ At least 8 characters…  ││
│  │                          ││
│  │ Confirm password *       ││
│  │ [icon] [input        ]   ││
│  ╰──────────────────────────╯│
│                              │
│  Pick an avatar (optional)   │
│  [🤓 🦊 🐶 🐱 ...]            │
│                              │
│  [server error · if]         │
│                              │
│  ╭──────────────────────────╮│
│  │   Create account         ││ ← primary CTA, full width, 48px
│  ╰──────────────────────────╯│
│                              │
│  Already have an account?    │
│  Sign in                     │
│                              │
│  (disclaimer)                │
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 | 来源 |
|---|---|---|
| 品牌标识 | `<div>` 渐变方块,PF 已搭 | AuthLayout |
| H1 + 副标题 | AuthLayout 自带 | AuthLayout |
| 字段组 | `<Input>` × 4(nickname / email / password / confirm)| design-tokens |
| 头像选择(可选) | `<AvatarPicker>` | design-tokens |
| 服务器错误 | inline alert(`border-danger bg-danger-soft`) | interaction-spec |
| 主 CTA | `<Button variant="primary" size="lg" block>` | design-tokens |
| 底部链接 | AuthLayout footer | AuthLayout |

## 交互

| 操作 | 行为 |
|---|---|
| 提交表单 | 1. 客户端校验(邮箱格式 / 密码长度 / 一致性) → 2. submit → 3. button `loading=true` → 4. 成功后 `navigate('/onboarding', replace)` → 5. 失败显示 serverError |
| 切到登录 | 点 "Sign in" → `navigate('/login')` |
| 选头像 | AvatarPicker 立即更新本地 state;不影响主 CTA 可点性 |

## 异常态

| 状态 | UI |
|---|---|
| **空** | 字段为空,主 CTA 仍可点(交给校验弹错);不要 disabled |
| **填一半** | 部分字段填了,其余空;无 error |
| **错误 — required** | 字段下方红字"This field is required." |
| **错误 — 邮箱格式** | 字段下方红字"That email address doesn't look right." |
| **错误 — 密码太短** | "Use at least 8 characters." |
| **错误 — 密码无字母** | "Add at least one letter." |
| **错误 — 密码无数字** | "Add at least one digit." |
| **错误 — 两次密码不一致** | "Passwords don't match." |
| **错误 — 邮箱已注册** | server error alert:"That email is already registered. Try signing in."(附 "去登录" 链接) |
| **成功 loading** | CTA 内 spinner,其他字段保持可编辑 |

## i18n

| key (en) | key (zh) |
|---|---|
| `auth.register.title` | `auth.register.title` |
| `auth.register.subtitle` | `auth.register.subtitle` |
| `auth.register.submit` | `auth.register.submit` |
| `auth.register.submitting` | `auth.register.submitting` |
| `auth.register.haveAccount` | `auth.register.haveAccount` |
| `auth.register.signInLink` | `auth.register.signInLink` |
| `auth.email` | `auth.email` |
| `auth.password` | `auth.password` |
| `auth.displayName` | `auth.displayName` |
| `auth.confirmPassword` | `auth.confirmPassword` |
| `auth.passwordHint` | `auth.passwordHint` |
| `auth.avatarOptional` | `auth.avatarOptional` |
| `auth.placeholders.{email,password,confirmPassword,displayName}` | (同上) |
| `auth.errors.emailTaken` | `auth.errors.emailTaken` |
| `auth.errors.invalidCredentials` | `auth.errors.invalidCredentials` |
| (其余错误见 `auth.errors.*`) | |

## 性能 / 可访问性

- 首屏 < 1s(无网络)。
- 表单提交按钮始终是 button 不是 a,防止误触回车跳转。
- label 永远可见(不是 placeholder-only)。
- 错误时焦点自动跳首个错误字段。

## 已知偏差 / 改进点

- ✅ 现有 PF-2 实现基本符合规格。
- 改进建议:Coding Agent 未来可加 "通过 Google 登录" / "通过 Apple 登录"(OAuth 占位)— 但本期不做。