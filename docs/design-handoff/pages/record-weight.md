# Page · RecordWeight

> 路由:`/records/weight` · 权限:RequireAuth · PF-3 实现

## 目的

录入一条体重记录。3 种输入方式:数字输入 / 语音输入 / 历史曲线缩略补录。

## 布局

```
┌──────────────────────────────┐
│  ← Weight                    │ ← TopBar + PageHeader
│  Log today's reading.        │
│                              │
│  ╭──────────────────────────╮│
│  │ Today's reading          ││
│  │                          ││
│  │   ┌──────┐               ││
│  │   │ 65.5 │ kg            ││ ← 大数字输入
│  │   └──────┘               ││
│  │  [kg | lb]  (segmented)  ││
│  │                          ││
│  │  [ 🎤 Hold to talk ]     ││ ← VoiceButton 大
│  ╰──────────────────────────╯│
│                              │
│  Last 7 days                 │
│  ──────●─●─●─●  65.5         │ ← 迷你折线
│                              │
│  Notes (optional)            │
│  [textarea]                  │
│                              │
│  ╭──────────────────────────╮│
│  │       Save               ││ ← 主 CTA, 48px
│  ╰──────────────────────────╯│
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| PageHeader | `<PageHeader title="Weight" subtitle="..."/>` + back 按钮(由 router state 提供)|
| 大数字输入 | `<input type="number" inputMode="decimal" className="text-5xl font-bold text-center">` |
| 单位切换 | `<SegmentedControl<'kg' \| 'lb'>>` |
| 语音按钮 | `<VoiceButton size="lg">` 或页内嵌 |
| 迷你曲线 | inline `<svg>` polyline,只画 7 个点 |
| 备注 | `<textarea>`(可选) |
| 主 CTA | `<Button variant="primary" size="lg" block>` |

## 交互

| 操作 | 行为 |
|---|---|
| 输入数字 | inputMode="decimal",focus 自动选 |
| 单位切换 | 数字 × 2.20462(lb→kg)或 ÷ (kg→lb),保留 1 位小数 |
| 长按语音 | 进入 listening 态;松开 → 自动填入 → focus 切回 input |
| 语音成功 | 自动滚动到 Save 按钮;CTA 高亮 1 帧 |
| 语音失败 | toast warning + 自动 fallback 到键盘输入 |
| Save | 校验数字(30-300 kg / 66-660 lb)→ 写入 localStorage → 弹庆祝 → navigate('/') |

## 状态

| 状态 | UI |
|---|---|
| **空** | "0" 灰色,CTA 禁用 "Enter your weight first" |
| **输入中** | 实时显示数字 + 单位 |
| **语音中** | 顶部半透明 backdrop + pulse 圆环 + "我在听" |
| **语音成功** | 自动跳数字 → focus Save |
| **语音失败** | toast + 自动 fallback |
| **保存中** | CTA spinner |
| **保存成功** | 屏幕中心 🎉 缩放弹层 + "你已超越 80% 的首次用户"(仅首次) |
| **错误 — 数字超范围** | "Please enter a number between 30 and 300 kg." |

## 异常态

| 状态 | UI |
|---|---|
| **网络 / 写入失败** | toast error "Couldn't save your weight. Try again." + CTA 恢复可点 |
| **首次成功** | 庆祝弹层 + "You crushed your first record!" |
| **重复录入同日** | 弹确认 modal "Replace today's reading?" |

## i18n

| key |
|---|
| `record.weight.{title,subtitle,cta.save}` |
| `record.weight.unit.{kg,lb}` |
| `record.weight.hint` |
| `record.weight.errors.{required,outOfRange,replaceToday}` |
| `record.voice.{tap,listening,success,fallback}` |

## A11y

- 大数字输入 `aria-label="Weight in kilograms"`。
- 单位切换 `<SegmentedControl>` 自带 radiogroup。
- 语音按钮 `aria-label` + `aria-pressed` 跟随 listening。