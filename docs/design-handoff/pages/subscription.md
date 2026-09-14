# Page · Subscription

> 路由:`/me/subscription` · 权限:RequireAuth · PF-9 实现

## 目的

展示 Pro 解锁功能 + 定价 + "1 人付费 = 2 人解锁" 说明 + 模拟订阅按钮。

## 布局

```
┌──────────────────────────────┐
│  ← Subscription              │
│  Unlock Pro for both of you. │
│                              │
│  ╭──────────────────────────╮│
│  │  ✨ Pro                  ││ ← hero 卡,品牌渐变
│  │  Move together. Win      ││
│  │  together.               ││
│  ╰──────────────────────────╯│
│                              │
│  What's included             │
│  ✓ No ads                    │
│  ✓ AI weekly summary         │
│  ✓ Custom themes             │
│  ✓ Advanced charts           │
│  ✓ Partner chart overlay     │
│  ✓ Cloud sync (coming soon)  │
│                              │
│  Pricing                     │
│  ╭────────╮ ╭────────╮       │
│  │ $4.99  │ │ $29.99 │       │
│  │ /month │ │ /year  │       │
│  │ Save 0%│ │Save 50%│       │
│  ╰────────╯ ╰────────╯       │
│                              │
│  ╭──────────────────────────╮│
│  │  💕 1 人付费 = 2 人解锁  ││
│  │  与你的伙伴一起解锁 Pro  ││
│  ╰──────────────────────────╯│
│                              │
│  ╭──────────────────────────╮│
│  │   模拟订阅 (MVP)         ││ ← 主 CTA, accent 色
│  ╰──────────────────────────╯│
│  V1.1:接 Stripe / Apple Pay  │
│                              │
│  (若已 Pro)                  │
│  ╭──────────────────────────╮│
│  │ You're on Pro ✓          ││
│  │ Renews on ...             ││
│  │ [Cancel subscription]    ││
│  ╰──────────────────────────╯│
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| PageHeader | `<PageHeader title="Subscription"/>` |
| Hero 卡 | 渐变光晕,品牌色 |
| 功能列表 | `<ul>` + `<Check />` icon |
| 定价卡 × 2 | `<Card raised>`,月 / 年 |
| 情侣解锁说明 | `<Card>` 暖色 chip |
| 主 CTA | `<Button variant="accent" size="lg" block>` "模拟订阅" |
| 已 Pro 态 | 不同布局,显示续费日期 + 取消按钮 |

## 交互

| 操作 | 行为 |
|---|---|
| 模拟订阅 | 立即解锁 Pro(双方)→ 庆祝弹层 → 跳回 /me |
| 切换月 / 年 | 高亮选中卡 |
| 取消订阅 | Modal 二次确认(可撤销 1 秒) |

## 状态

| 状态 | UI |
|---|---|
| **未订阅** | 显示定价 + 主 CTA |
| **已 Pro** | 显示续费 + 取消入口 |
| **ta 已订阅 / 你未订阅** | 显示 "Your partner is on Pro. You're getting all benefits for free." + 鼓励按钮 "Subscribe yourself too" |
| **订阅成功(庆祝)** | 屏幕中心弹层 + 🪙 飞入 |

## 异常态

| 状态 | UI |
|---|---|
| **未绑定情侣** | 隐藏 "1 人付费 = 2 人解锁" 段,改为 "Solo Pro" 描述 |
| **解锁失败** | toast error + CTA 恢复 |
| **取消订阅** | 1 秒可撤销 Toast |

## i18n

| key |
|---|
| `subscription.{title,subtitle,heroTitle,heroBody}` |
| `subscription.features.{noAds,ai,themes,charts,partnerOverlay,cloudSync}` |
| `subscription.pricing.{monthly,yearly,save,suffix}` |
| `subscription.couple.unlockTogether` |
| `subscription.cta.simulate` / `cancel` |
| `subscription.active.{title,renews,cancel}` |
| `subscription.active.partnerOnPro` |

## A11y

- 定价卡对比用 `<table>`(视觉友好 + SR 友好)。
- "模拟订阅"按钮加 `aria-label="Simulate Pro subscription (no real payment in MVP)"`。
- 取消订阅 modal `dismissible: false`。