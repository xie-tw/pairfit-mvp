# Page · CoupleBound(已绑定协作页)

> 路由:`/couple`(已绑定时显示)或 `/couple/bound` · 权限:RequireAuth · PF-6 实现

## 目的

已绑定情侣的协作页。看 ta 今天做了什么 → 鼓励 ta → 解绑。

## 布局

```
┌──────────────────────────────┐
│  Couple                      │
│                              │
│  ╭──────────────────────────╮│ ← CoupleRibbon
│  │ [me] & [ta]    ❤️ 42 天  ││
│  │ 🪙 211          [Cheer]  ││
│  ╰──────────────────────────╯│
│                              │
│  Today                      │
│                              │
│  ╭────────────╮ ╭────────────╮│
│  │ 📊 Weight  │ │ 🍱 Food    ││ ← ta 的今日 3 模块
│  │ 65.5 kg   │ │ 820 kcal  ││
│  │ (logged 2h)│ │(logged 1h)││
│  ╰────────────╯ ╰────────────╯│
│  ╭────────────╮                │
│  │ 🏃 Workout │                │
│  │ 30 min    │                │
│  ╰────────────╯                │
│                              │
│  Streak                      │
│  Both of you: 7 days 🔥      │
│                              │
│  Actions                     │
│  [Send cheer] [More]         │
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| PageHeader | `<PageHeader title="Couple"/>` |
| 顶部 ribbon | `<CoupleRibbon>` |
| ta 今日 3 模块 | 与 Home 同结构,但显示 ta 数据 |
| Streak 卡 | `<Card>` 显示共同连续天数 |
| Actions | 主 CTA "Send cheer" + 次 CTA "More" |

## 交互

| 操作 | 行为 |
|---|---|
| 点模块卡 | 跳 ta 的详情(MVP 显示静态数据) |
| Send cheer | 弹 BottomSheet 选 emoji 表情 → 发送 → ta 收到 toast + Coins +10 |
| More | 弹 BottomSheet:解绑 / 邀请 ta 重新生成码 / 隐藏 ta 的进度 |

## 状态

| 状态 | UI |
|---|---|
| **active** | 正常显示 |
| **unbinding(7 天冷却)** | 顶部 ribbon 切 warning + 文案 + 解绑入口禁用 |
| **ta 今天没记录** | 模块卡显示空态 "Mei hasn't logged today yet." |
| **ta 今天记录了** | 模块卡显示数据 + "Cheer!" emoji |
| **你刚收到 ta 的 cheer** | toast + Coins 数字 +10 动画 |

## 异常态

| 状态 | UI |
|---|---|
| **解绑 modal 二次确认** | `Modal` `dismissible={false}`,含 "再想想" + "确认解绑"(danger)|
| **解绑成功** | 跳 /couple + EmptyState("你现在是单身模式")|
| **网络 / 数据错误** | 模块卡 skeleton + toast |
| **ta 改昵称 / 头像** | ribbon avatar 实时更新 |

## i18n

| key |
|---|
| `couple.bound.{today, streak, bothStreak, actions}` |
| `couple.cheer.{title, sendSuccess, dailyLimitReached}` |
| `couple.more.{unbind, regenerateInvite, hideProgress, hideConfirm}` |
| `couple.unbind.{title, body, cooldown, confirm, success}` |

## A11y

- ta 的卡片 `aria-label="Partner today's weight: 65.5 kilograms"`。
- cheer 按钮显示 `aria-label="Send cheer to partner (2 of 3 today)"` — 今日剩余次数。
- 解绑 modal 强制焦点 trap,`dismissible: false`。