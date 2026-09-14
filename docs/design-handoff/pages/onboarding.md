# Page · Onboarding(目标设定)

> 路由:`/onboarding` · 权限:已登录(由 RequireAuth 隐式保证) · PF-3 实现 · 占位见 `src/pages/OnboardingPlaceholder.tsx`

## 目的

新用户第一次进来,**30 秒触达 Aha 时刻**(目标曲线动效)。3 步完成目标设定:

1. 选方向(减肥 / 增重)
2. 起始体重 + 目标体重
3. 节奏 + 预览曲线 + 完成

## 布局(3 步 + 进度条)

```
┌──────────────────────────────┐
│  [顶部安全区]                  │
│                              │
│  ●─○─○  Step 1 of 3         │ ← 进度条
│                              │
│  What's your goal?           │ ← h1
│  Pick a direction to start.  │ ← p
│                              │
│  ╭──────────╮  ╭──────────╮ │
│  │   ↓      │ │   ↑      │ │
│  │  Lose    │ │  Gain    │ │
│  │  weight  │ │ weight   │ │
│  │ (coral)  │ │ (teal)   │ │
│  ╰──────────╯  ╰──────────╯ │
│                              │
│  ╭──────────────────────────╮│
│  │      Next                ││ ← 主 CTA, 整页底部
│  ╰──────────────────────────╯│
└──────────────────────────────┘
```

### Step 2(体重)

```
┌──────────────────────────────┐
│  ●─●─○  Step 2 of 3         │
│                              │
│  Your weight                 │
│  We'll calculate your pace.  │
│                              │
│  Start weight                │
│  [icon] [  65.5 ] [kg/lb ▾] │
│                              │
│  Target weight               │
│  [icon] [  60.0 ] [kg/lb ▾] │
│                              │
│  ╭──────────────────────────╮│
│  │      Next                ││
│  ╰──────────────────────────╯│
└──────────────────────────────┘
```

### Step 3(节奏 + 预览)

```
┌──────────────────────────────┐
│  ●─●─●  Step 3 of 3         │
│                              │
│  Your pace                   │
│  How fast do you want to     │
│  reach your goal?            │
│                              │
│  Lose 0.5 kg / week          │
│  ◯─────────────●──────       │ ← slider
│  Slow        Fast            │
│                              │
│  ╭──────────────────────────╮│
│  │      Goal curve          ││ ← 曲线预览
│  │      ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓     ││
│  ╰──────────────────────────╯│
│                              │
│  You'll reach 60.0 kg by     │
│  Nov 14, 2026 (~24 weeks)    │
│                              │
│  ╭──────────────────────────╮│
│  │      Start tracking      ││ ← 主 CTA, 完成态
│  ╰──────────────────────────╯│
└──────────────────────────────┘
```

## 元素清单

| 步骤 | 元素 | 组件 / 来源 |
|---|---|---|
| 全部 | 顶部进度条 | 自定义 3 段,`<div>` 圆点 + 连接线 |
| Step 1 | 方向单选卡 × 2 | `<Card>` raised,大 icon + 标题;选中态 2px `brand-500` 边 |
| Step 2 | 体重输入 × 2 | `<Input>` 带 trailing 单位 chip |
| Step 3 | 节奏 slider | `<input type="range">` 自定义样式 |
| Step 3 | 曲线预览 | inline `<svg>` 或 Recharts,动效绘制 |
| 全部 | 主 CTA | `<Button variant="primary" size="lg" block>` |
| 完成 | 庆祝 | 屏幕中心缩放弹层 + emoji 爆裂 |

## 交互

| 操作 | 行为 |
|---|---|
| Step 1 选方向 | 立即切换 step;若已选可改;next 1.5s 后才能点 |
| Step 2 输入 | 数字键盘;上下限校验(起始 > 目标 / < 目标,看方向) |
| Step 3 slider | 拖动 → 实时重算预计达成日期 + 重绘曲线 |
| 完成 | toast 成功 + navigate('/', replace) |

## 异常态

| 状态 | UI |
|---|---|
| **空** | 字段空,CTA 禁用 + 文案"先选个方向" |
| **Step 2 体重非法** | "Please enter a number between 30 and 300 kg." |
| **Step 2 起始 = 目标** | "Start and target must differ." |
| **Step 3 节奏为 0** | 滑块默认给个推荐项,不允许 0 |
| **完成态庆祝** | 屏幕中心 1.6x 缩放弹层 + 🎉 emoji 飞出 + 粒子 |

## i18n

| key |
|---|
| `onboarding.step{n}.title` / `subtitle` |
| `onboarding.direction.lose` / `gain` |
| `onboarding.field.startWeight` / `targetWeight` |
| `onboarding.pace.label` |
| `onboarding.preview.reachBy` / `weeks` |
| `onboarding.cta.next` / `start` |
| `onboarding.errors.*` |

## A11y

- 每一步用 `<fieldset>` + `<legend>` 包裹,SR 知道这是"表单组"。
- 方向单选用 `<input type="radio">` 实现(而非 `<button>`)— 键盘可切换。
- 曲线预览给 SR 文本替代:"预计 24 周后达到 60 公斤"。
- 进度条 `<ol>` + `<li aria-current="step">`,SR 播报"Step 2 of 3"。