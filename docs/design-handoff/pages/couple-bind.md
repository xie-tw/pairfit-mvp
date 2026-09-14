# Page · CoupleBind(未绑定 / 绑定中)

> 路由:`/couple` (未绑定时显示)或 `/couple/bind` · 权限:RequireAuth · PF-6 实现

## 目的

邀请 ta 一起用 PairFit。两种操作:生成自己的邀请码 / 输入对方的邀请码。

## 布局

```
┌──────────────────────────────┐
│  Couple                      │
│  Bind, share and cheer each  │
│  other on.                   │
│                              │
│  ╭──────────────────────────╮│
│  │  ✨ Bind with partner    ││ ← 主 hero card
│  │                          ││
│  │  Pair up to share        ││
│  │  progress, coins and     ││
│  │  challenges.             ││
│  │                          ││
│  │  [Generate invite code]  ││ ← primary
│  │  [How it works]          ││ ← secondary
│  ╰──────────────────────────╯│
│                              │
│  ╭────────╮ ╭────────╮       │
│  │ 🎯     │ │ 🪙     │       │ ← 4 个 feature 卡
│  │Shared  │ │Coins & │       │
│  │goals   │ │cheers  │       │
│  ╰────────╯ ╰────────╯       │
│  ╭────────╮ ╭────────╮       │
│  │ 🎤     │ │ 🔒     │       │
│  │Voice   │ │Private │       │
│  │notes   │ │& local │       │
│  ╰────────╯ ╰────────╯       │
└──────────────────────────────┘
```

### 生成邀请码后

```
┌──────────────────────────────┐
│  Couple                      │
│  Share this code with your   │
│  partner.                    │
│                              │
│  ╭──────────────────────────╮│
│  │                          ││
│  │      A 2 K 9 P 7         ││ ← 大字间距 6 位
│  │                          ││
│  │  Expires in 23h 59m      ││ ← 倒计时
│  │                          ││
│  │  [Copy]  [Share]         ││
│  ╰──────────────────────────╯│
│                              │
│  Or enter their code →        │
└──────────────────────────────┘
```

### 输入邀请码态

```
┌──────────────────────────────┐
│  Couple                      │
│  Enter your partner's code.  │
│                              │
│  ╭──────────────────────────╮│
│  │ [A] [2] [K] [9] [_] [_] ││ ← 6 个 input
│  ╰──────────────────────────╯│
│                              │
│  ╭──────────────────────────╮│
│  │       Bind               ││
│  ╰──────────────────────────╯│
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| PageHeader | `<PageHeader title="Couple"/>` |
| Hero card | `<Card raised>` 含品牌渐变光晕 |
| Feature 4 卡 | `<Card>` 网格 2×2 |
| 邀请码显示 | 大字 + 倒计时 + Copy / Share 按钮 |
| 邀请码输入 | 6 个独立 input,自动跳格 |
| 主 CTA | `<Button>` |

## 交互

| 操作 | 行为 |
|---|---|
| Generate invite code | 生成 6 位码 + 24h 倒计时启动 + 自动 copy 到剪贴板 + toast success |
| Copy | 复制码到剪贴板 + toast |
| Share | 调 `navigator.share` 或弹 BottomSheet(微信 / 短信 / 复制)|
| 输入码 | 6 个 input,自动跳下一格;满 6 位自动尝试 bind |
| Bind 成功 | 跳 /couple/bound + 庆祝 |
| Bind 失败 | toast warning "邀请码无效或过期" + 输入清空 |
| 3 次错误 | 30s 冷却 + 倒计时显示 |

## 异常态

| 状态 | UI |
|---|---|
| **未生成** | 仅 "Generate invite code" CTA |
| **已生成,等待中** | 显示码 + 倒计时 + "Share with partner" |
| **输入码无效** | toast + 输入框红边 + 自动清空 |
| **3 次错误后冷却** | 输入框 disabled + 倒计时 30s |
| **ta 已解绑 7 天冷却** | "Your partner just unbound. Try again in 7 days." |

## i18n

| key |
|---|
| `couple.{title,subtitle,bind,bindHint}` |
| `couple.invite.{generateCode,codeLabel,expiresIn,copy,share,enterCode,bind}` |
| `couple.shareSheet.{title,wechat,sms,copy}` |
| `couple.errors.{invalid,expired,cooldown,partnerCooldown}` |

## A11y

- 6 位 input 用 `inputMode="text" maxLength={1}`,每个 input `aria-label="Invite code character 1 of 6"`。
- 倒计时 `aria-live="polite"`,SR 不会一直打断。
- 复制成功 toast `role="status"`,SR 播报"Code copied"。