# Page · RecordExercise

> 路由:`/records/exercise` · 权限:RequireAuth · PF-5 实现

## 目的

录入一条运动记录。语音优先("跑步 30 分钟")+ 类型 / 强度 / 时长 / 估算消耗。

## 布局

```
┌──────────────────────────────┐
│  ← Exercise                  │
│  What did you do?            │
│                              │
│  ╭──────────────────────────╮│
│  │  [ 🎤 Hold to talk ]     ││
│  │                          ││
│  │  "ran 30 minutes"        ││
│  ╰──────────────────────────╯│
│                              │
│  Type                        │ ← 类型选择 chips
│  🏃 🏊 🚴 💪 🧘 🚶 🏸      │
│  Running (selected)          │
│                              │
│  Duration                    │
│  ◯────●───────── 30 min      │ ← slider / number
│                              │
│  Intensity                   │
│  [Low] [Med ●] [High]        │ ← SegmentedControl
│                              │
│  Estimated burn              │
│  ─ 300 kcal ─                │ ← 大数字
│  (running · 30min · medium)   │
│                              │
│  ╭──────────────────────────╮│
│  │   Save · 300 kcal        ││
│  ╰──────────────────────────╯│
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| VoiceButton | 顶部主入口 |
| 类型 chips | 横向滚动 emoji 选择 |
| Duration slider / number | `<input type="range">` 或 `<Input type="number">` |
| Intensity SegmentedControl | 3 选 1 |
| 估算卡 | 大数字 + 解释 |
| 主 CTA | `<Button>` |

## 交互

| 操作 | 行为 |
|---|---|
| 长按语音 | 识别 → 自动填 type + duration;若识别不出 type,弹类型选择 |
| 选 type | 触发重算 kcal |
| 改 duration | 触发重算 kcal |
| 改 intensity | 触发重算 kcal |
| Save | 校验(type + duration 必填)→ 写入 → 庆祝 → 跳 / |

## 估算公式(MVP 简化版)

```
kcal = MET * weight_kg * duration_hours
其中:
- MET 由 type + intensity 决定
  - Running: low=6, med=8, high=10
  - Cycling: low=4, med=6, high=8
  - Swimming: low=5, med=7, high=9
  - Strength: low=3, med=5, high=6
  - Yoga: low=2, med=3, high=4
  - Walking: low=2, med=3, high=4
  - Other: low=3, med=5, high=7
- weight_kg 从 user.goal.startWeight 取(若未设,默认 65 kg)
```

## 状态

| 状态 | UI |
|---|---|
| **空** | VoiceButton + "Or pick manually →" |
| **语音中** | pulse |
| **语音识别** | 自动填 type + duration;若缺 type,展开 chips |
| **手动填写中** | type / duration / intensity 字段可编辑 |
| **估算 loading** | 数字 shimmer |
| **保存成功** | 庆祝 + 跳 / |

## 异常态

| 状态 | UI |
|---|---|
| **type 缺失** | chips 红色 ring |
| **duration = 0** | slider 默认 30,可改但不能 0 |
| **语音无识别** | toast + 自动展开手动 |

## i18n

| key |
|---|
| `record.exercise.{title,subtitle,cta.save}` |
| `record.exercise.type.{running,cycling,swimming,strength,yoga,walking,other}` |
| `record.exercise.intensity.{low,medium,high}` |
| `record.exercise.errors.*` |

## A11y

- chips `role="radiogroup"` 互斥单选。
- duration slider 加 `aria-valuenow` / `aria-valuetext="30 minutes"`。
- kcal 估算 `aria-live="polite"`,数值变化时 SR 播报。