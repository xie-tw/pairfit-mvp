# Page · RecordFood

> 路由:`/records/food` · 权限:RequireAuth · PF-4 实现

## 目的

录入一条饮食记录。语音优先(说了什么 → AI 估算 → 用户确认)。降级:手动输入。

## 布局(3 段:输入 → 估算 → 确认)

### 输入态

```
┌──────────────────────────────┐
│  ← Food                      │
│  What did you eat?           │
│                              │
│  ╭──────────────────────────╮│
│  │                          ││
│  │  [ 🎤 Hold to talk ]     ││ ← VoiceButton 巨号
│  │                          ││
│  │  "I had chicken rice     ││ ← transcript 浮现
│  │   and milk tea"          ││
│  ╰──────────────────────────╯│
│                              │
│  Or type it yourself →       │ ← 链接,展开手动输入
│                              │
│  Recent                      │
│  • Chicken rice + milk tea   │ ← 历史快选
│  • Salad + coffee            │
│  • Beef noodle soup          │
└──────────────────────────────┘
```

### AI 估算态(loading)

```
┌──────────────────────────────┐
│  Estimating...               │
│                              │
│  ┌────────────────────┐      │
│  │  ⏳ (spinner)      │      │ ← 半透明卡片
│  │  Chicken rice      │      │
│  │  Milk tea          │      │
│  └────────────────────┘      │
│  (AI working · ~10s)         │
└──────────────────────────────┘
```

### AI 估算态(成功)

```
┌──────────────────────────────┐
│  ← Food                      │
│  We think this is what       │
│  you ate.                    │
│                              │
│  ╭──────────────────────────╮│
│  │ 🍗 Chicken rice   550kcal││ ← 可编辑
│  │    30g P · 70g C · 18g F ││
│  │ ────────────────────────││
│  │ 🥤 Milk tea       250kcal││
│  │    6g P · 50g C · 8g F  ││
│  │ ────────────────────────││
│  │ Total              800kcal││
│  ╰──────────────────────────╯│
│                              │
│  Sparkles ✨ AI estimate ·   │ ← 置信度 + 编辑入口
│  82% confident · Edit        │
│                              │
│  ╭──────────────────────────╮│
│  │     Save 800 kcal        ││
│  ╰──────────────────────────╯│
│  Try again                   │
└──────────────────────────────┘
```

### 手动输入态(AI 失败降级)

```
┌──────────────────────────────┐
│  AI couldn't catch that.     │
│  Type the values yourself.   │
│                              │
│  Food name                   │
│  [input]                     │
│                              │
│  Calories (kcal)             │
│  [input]                     │
│                              │
│  Add another item →          │ ← 列表式添加
│                              │
│  [Save]                      │
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| VoiceButton | `<VoiceButton size="xl">` |
| Transcript 显示 | `<Card>` 内 transcript 文字 |
| AI 估算加载 | spinner + 卡片轮廓 |
| 估算结果 | `<MealCard>`(组件)+ 备注 + CTA |
| 手动输入 | `<Input>` 字段 + 列表添加 |
| 主 CTA | `<Button>` |

## 交互

| 操作 | 行为 |
|---|---|
| 长按语音 | listening → 松开 → 自动跳估算态 |
| 估算成功 | 显示 MealCard + CTA "Save 800 kcal" |
| 点 item 编辑 | inline editor(数字 / 名称可改)|
| 估算失败 / 降级 | 切到手动输入态,toast "AI is taking too long. Try typing." |
| Save | 写入 → 弹庆祝 → 跳 / |

## 状态

| 状态 | UI |
|---|---|
| **空** | 仅显示 VoiceButton + "Or type it yourself →" |
| **语音中** | pulse + 屏幕浮层 |
| **语音识别 → 自动切估算态** | 立即跳估算加载 |
| **估算 loading** | 半透明 + spinner,"AI working · ~10s" |
| **估算成功** | MealCard + 置信度标签 + CTA |
| **估算超时(>10s)** | 切手动输入 + toast warning |
| **手动输入中** | 输入字段可编辑,可加多个 item |
| **保存成功** | 庆祝 + 跳 / |

## 异常态

| 状态 | UI |
|---|---|
| **AI 估算为空** | "AI couldn't identify this meal. Try typing." |
| **AI 估算明显错** | 允许用户点 "Edit" inline 调整 |
| **Save 失败** | toast error + CTA 恢复 |
| **重复同日多条** | 允许(同一天可多餐);展示今日总 kcal |

## i18n

| key |
|---|
| `record.food.{title,subtitle,placeholder}` |
| `record.food.transcriptLabel` |
| `record.food.ai.estimating` / `confidence` |
| `record.food.manual.{title,foodName,calories,addItem}` |
| `record.food.errors.{aiTimeout,empty}` |
| `record.food.cta.save` / `tryAgain` |

## A11y

- AI 估算置信度 `aria-label="82 percent confident"`。
- 估算卡片是 `<table>`(隐式),每个 item 一行 `<tr>`。
- 手动输入时,加 item 用 `<button>` 而非链接。