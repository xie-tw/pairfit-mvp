# Page · Home(今日打卡)

> 路由:`/` · 权限:RequireAuth · 当前实现:`src/pages/Home.tsx`(PF-1 内联,PF-3 重写)

## 目的

首页 = 用户最常打开的页面。目标:每次打开 < 1s 看懂"今天我该做什么"。3 个核心模块:

1. **顶部 — 你的进度 + ta 的进度**(双 ProgressCard)
2. **中部 — 今日打卡 3 模块**(体重 / 饮食 / 运动)
3. **底部 — 浮动的语音按钮**(右下角,floating action)

## 布局

```
┌────────────────────────────────┐
│  Hi, partner            🔥 12  │ ← PageHeader + StreakChip trailing
│  Today's plan for both of you. │
│                                │
│  ╭────────────╮ ╭────────────╮ │
│  │ 📉 你       │ │ 📈 ta       │ │ ← ProgressCard × 2
│  │ 0.5 / 1.5 kg│ │ 2.1 / 3.0 km│ │
│  │ ────── 33%  │ │ ────── 70%  │ │
│  ╰────────────╯ ╰────────────╯ │
│                                │
│  TODAY'S CHECK-IN  View all →  │
│                                │
│  ╭────────────╮ ╭────────────╮ │
│  │ 📊 Weight   │ │ 🍱 Food    │ │
│  │ 65.5 kg    │ │ 820 kcal   │ │
│  │ [log]      │ │ [log]      │ │
│  ╰────────────╯ ╰────────────╯ │
│  ╭────────────╮                │
│  │ 🏃 Workout  │                │
│  │ — min      │                │
│  │ [log]      │                │
│  ╰────────────╯                │
│                                │
│  ┌──────────────────────────┐  │
│  │ Couple status           │  │ ← 仅已绑定
│  │ Mei + Aki · 🪙 211      │  │
│  │ [Send cheer]             │  │
│  └──────────────────────────┘  │
│                                │
│                          [🎤]  │ ← 浮动语音按钮
│                                │
│  [TabBar 5 items]              │
└────────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| PageHeader | `<PageHeader title="Hi, partner" trailing={<StreakChip value={12} />}>` |
| 双进度卡 | `<div className="grid sm:grid-cols-2 gap-4">` 内含 2× `<ProgressCard accent="brand\|accent">` |
| 模块标题 | `<h2 className="pf-section-title">TODAY'S CHECK-IN</h2>` |
| 3 个模块 | `<Card pf-press onClick={navigate('/records/...')}>` |
| 已绑定情侣卡 | `<CoupleRibbon>` 或简化版 |
| 浮动语音按钮 | `<button className="fixed bottom-20 right-4 size-14 rounded-full bg-brand-500 shadow-lg">🎤</button>` |
| 底部 TabBar | 由 `<AppShell>` 提供 |

## 交互

| 操作 | 行为 |
|---|---|
| 点体重 / 饮食 / 运动模块卡 | 跳对应录入页 |
| 点浮动语音按钮 | 跳"语音识别路由"或弹 BottomSheet 让用户选录入类型(PF-3 决定)|
| 点 CoupleRibbon | 跳 /couple/bound |
| 切换语言 / 主题 | TopBar 按钮(全局)|

## 状态

| 状态 | UI |
|---|---|
| **今日 3 模块均未记录** | 模块卡显示 "Log your first one" + 主 CTA "+" |
| **部分完成** | 已记录的模块显示该条数据 + "Edit" / "Update" |
| **全部完成** | 模块卡显示 ✓ + 鼓励语 "All done for today!" + 顶部进度条满 |
| **已绑定** | 显示 CoupleRibbon |
| **未绑定** | 显示 EmptyState("绑定你的伙伴,一起动")+ CTA |
| **网络 / 数据加载** | ProgressCard 与 3 模块用 `<StatTile>` skeleton |

## 异常态

| 状态 | UI |
|---|---|
| **首次访问(无目标)** | ProgressCard 显示 "Set a goal to start tracking" + CTA "Set goal" |
| **数据加载中** | 全部 `<StatTile>` 用 skeleton |
| **今日 3 模块均失败** | 模块卡显示 ⚠ + 重试按钮(网络 / 写入失败)|

## i18n

| key |
|---|
| `home.{title,subtitle,youProgress,partnerProgress,todayGoal,viewAll}` |
| `home.module.weight` / `food` / `workout` |
| `home.module.logCta` / `updateCta` / `firstDoneCta` |
| `home.streak.today` |
| `home.couple.invite` |

## A11y

- 进度卡 `aria-label` 包含 "你 + 0.5 / 1.5 公斤,33% 完成"。
- 模块卡整卡可点击 → 用 `<a>` 包裹,而不是 `<button onClick>`。
- 浮动语音按钮 `aria-label="Voice record"`,不在主流程;有视觉但不影响键盘导航。