# PairFit · 视觉原型清单(screens-manifest)

> 版本:v1.0 · 2026-09-14
>
> 本文档列出 **每个页面 × 状态 × 语言 × 主题** 的所有原型,并为高保真 PNG mockup 提供 AI prompt 模板(可粘贴到 v0.dev / Stitch / Galileo AI / Figma AI)。

---

## 1. 已交付的 SVG 线框(`screens/*.svg`)

由于本环境无 v0 / Stitch / Figma AI 出图能力,本交接包提供 **手绘 SVG 线框**(标注关键 token、版式、文案)用于沟通意图;每个页面 × light/dark = 2 张,**总计 30 张**:

| # | 文件 | 页面 | 主题 | 文案语言 |
|---|---|---|---|---|
| 01 | `01-onboarding-light-en.svg` | Onboarding | light | en |
| 02 | `02-onboarding-dark-zh.svg` | Onboarding | dark | zh |
| 03 | `03-register-light-en.svg` | Register | light | en |
| 04 | `04-register-dark-zh.svg` | Register | dark | zh |
| 05 | `05-login-light-en.svg` | Login | light | en |
| 06 | `06-login-dark-zh.svg` | Login | dark | zh |
| 07 | `07-forgot-light-en.svg` | ForgotPassword | light | en |
| 08 | `08-forgot-dark-zh.svg` | ForgotPassword | dark | zh |
| 09 | `09-home-today-light-en.svg` | Home(今日打卡) | light | en |
| 10 | `10-home-today-dark-zh.svg` | Home | dark | zh |
| 11 | `11-home-empty-light-en.svg` | Home(空态) | light | en |
| 12 | `12-home-empty-dark-zh.svg` | Home | dark | zh |
| 13 | `13-record-weight-voice-light-en.svg` | RecordWeight(语音中) | light | en |
| 14 | `14-record-weight-success-dark-zh.svg` | RecordWeight(成功) | dark | zh |
| 15 | `15-record-food-ai-light-en.svg` | RecordFood(AI 估算) | light | en |
| 16 | `16-record-food-manual-dark-zh.svg` | RecordFood(手动) | dark | zh |
| 17 | `17-record-exercise-voice-light-en.svg` | RecordExercise(语音中) | light | en |
| 18 | `18-record-exercise-success-dark-zh.svg` | RecordExercise(成功) | dark | zh |
| 19 | `19-couple-unbound-light-en.svg` | Couple(未绑定) | light | en |
| 20 | `20-couple-unbound-dark-zh.svg` | Couple | dark | zh |
| 21 | `21-couple-bind-code-light-en.svg` | CoupleBind(已生成码) | light | en |
| 22 | `22-couple-bound-today-dark-zh.svg` | CoupleBound(协作页) | dark | zh |
| 23 | `23-trends-7day-light-en.svg` | Trends(7 天) | light | en |
| 24 | `24-trends-90day-dark-zh.svg` | Trends(90 天) | dark | zh |
| 25 | `25-trends-ai-report-light-en.svg` | Trends(AI 周报) | light | en |
| 26 | `26-me-free-dark-zh.svg` | Me(免费版) | dark | zh |
| 27 | `27-me-pro-light-en.svg` | Me(Pro 版) | light | en |
| 28 | `28-profile-light-en.svg` | Profile | light | en |
| 29 | `29-subscription-paywall-dark-zh.svg` | Subscription | dark | zh |
| 30 | `30-settings-export-light-en.svg` | Settings | light | en |

---

## 2. 全量原型矩阵(80+ 张 PNG 目标)

每行是一个原型 `(page, state, language, theme)`;未交付的部分由 AI 出图工具补齐。

### 2.1 账号 / 引导

| 页面 | 状态 | en-light | en-dark | zh-light | zh-dark |
|---|---|---|---|---|---|
| Register | 空 | ✅ SVG 03 | PNG | PNG | ✅ SVG 04 |
| Register | 填一半 | PNG | PNG | PNG | PNG |
| Register | 错误(邮箱已注册) | PNG | PNG | PNG | PNG |
| Register | 成功 loading | PNG | PNG | PNG | PNG |
| Login | 空 | ✅ SVG 05 | PNG | PNG | ✅ SVG 06 |
| Login | 错误(凭据错) | PNG | PNG | PNG | PNG |
| Login | 忘记密码链接 hover | PNG | PNG | PNG | PNG |
| ForgotPassword | 空 | ✅ SVG 07 | PNG | PNG | ✅ SVG 08 |
| ForgotPassword | 邮箱错误 | PNG | PNG | PNG | PNG |
| ForgotPassword | 已发送(成功态) | PNG | PNG | PNG | PNG |
| Onboarding | 选方向(减肥 / 增重) | ✅ SVG 01 | PNG | PNG | ✅ SVG 02 |
| Onboarding | 起始体重输入 | PNG | PNG | PNG | PNG |
| Onboarding | 节奏 slider | PNG | PNG | PNG | PNG |
| Onboarding | 目标曲线预览 | PNG | PNG | PNG | PNG |
| Onboarding | 庆祝弹层 | PNG | PNG | PNG | PNG |

### 2.2 首页 / 记录

| 页面 | 状态 | en-light | en-dark | zh-light | zh-dark |
|---|---|---|---|---|---|
| Home | 三模块均未记录 | ✅ SVG 11 | PNG | PNG | ✅ SVG 12 |
| Home | 部分完成 | PNG | PNG | PNG | PNG |
| Home | 全部完成 + 情侣卡片 | ✅ SVG 09 | PNG | PNG | ✅ SVG 10 |
| Home | 已绑定但 ta 未记录 | PNG | PNG | PNG | PNG |
| Home | 长按语音(语音中) | PNG | PNG | PNG | PNG |
| RecordWeight | 空 | PNG | PNG | PNG | PNG |
| RecordWeight | 输入中 | PNG | PNG | PNG | PNG |
| RecordWeight | 语音中(pulse) | ✅ SVG 13 | PNG | PNG | PNG |
| RecordWeight | 成功(庆祝) | PNG | PNG | PNG | ✅ SVG 14 |
| RecordWeight | 单位切换(kg/lb) | PNG | PNG | PNG | PNG |
| RecordWeight | 错误(超出范围) | PNG | PNG | PNG | PNG |
| RecordFood | 空 | PNG | PNG | PNG | PNG |
| RecordFood | 语音输入 → AI 估算显示 | ✅ SVG 15 | PNG | PNG | PNG |
| RecordFood | 手动输入(AI 失败降级) | PNG | PNG | PNG | ✅ SVG 16 |
| RecordFood | 营养素条确认 | PNG | PNG | PNG | PNG |
| RecordFood | 成功 | PNG | PNG | PNG | PNG |
| RecordExercise | 空 | PNG | PNG | PNG | PNG |
| RecordExercise | 语音中 | ✅ SVG 17 | PNG | PNG | PNG |
| RecordExercise | 强度选择(low/med/high) | PNG | PNG | PNG | PNG |
| RecordExercise | 成功 | PNG | PNG | PNG | ✅ SVG 18 |

### 2.3 情侣

| 页面 | 状态 | en-light | en-dark | zh-light | zh-dark |
|---|---|---|---|---|---|
| Couple(未绑定) | 空状态 + 生成码 CTA | ✅ SVG 19 | PNG | PNG | ✅ SVG 20 |
| Couple(未绑定) | "How it works" sheet | PNG | PNG | PNG | PNG |
| CoupleBind | 输入码中 | PNG | PNG | PNG | PNG |
| CoupleBind | 已生成码 + 24h 倒计时 | ✅ SVG 21 | PNG | PNG | PNG |
| CoupleBind | 分享 sheet | PNG | PNG | PNG | PNG |
| CoupleBind | 码错误 / 过期 | PNG | PNG | PNG | PNG |
| CoupleBound | 协作页(ta 今日 3 卡) | PNG | PNG | PNG | ✅ SVG 22 |
| CoupleBound | 鼓励按钮 hover | PNG | PNG | PNG | PNG |
| CoupleBound | 表情评论 sheet | PNG | PNG | PNG | PNG |
| CoupleBound | 解绑确认 modal | PNG | PNG | PNG | PNG |

### 2.4 趋势 / 我的

| 页面 | 状态 | en-light | en-dark | zh-light | zh-dark |
|---|---|---|---|---|---|
| Trends | 7 天体重曲线 | ✅ SVG 23 | PNG | PNG | PNG |
| Trends | 30 天卡路里柱状 | PNG | PNG | PNG | PNG |
| Trends | 90 天运动时长 | PNG | PNG | PNG | ✅ SVG 24 |
| Trends | AI 周报卡 | ✅ SVG 25 | PNG | PNG | PNG |
| Trends | 数据不足(<7 天) | PNG | PNG | PNG | PNG |
| Trends | 对比 ta 的曲线(Pro) | PNG | PNG | PNG | PNG |
| Me | 免费版账户卡 | PNG | PNG | PNG | ✅ SVG 26 |
| Me | Pro 版账户卡 + 金色徽章 | ✅ SVG 27 | PNG | PNG | PNG |
| Me | 语言切换 hover | PNG | PNG | PNG | PNG |
| Me | 主题切换(light/dark/system) | PNG | PNG | PNG | PNG |
| Profile | 头像选择中 | ✅ SVG 28 | PNG | PNG | PNG |
| Profile | 单位切换 | PNG | PNG | PNG | PNG |
| Profile | 退出确认 modal | PNG | PNG | PNG | PNG |
| Subscription | 解锁 Pro 卡片 | PNG | PNG | PNG | ✅ SVG 29 |
| Subscription | "1 人付费 = 2 人解锁" 说明 | PNG | PNG | PNG | PNG |
| Subscription | 模拟订阅成功(庆祝) | PNG | PNG | PNG | PNG |
| Settings | 默认 | PNG | PNG | PNG | PNG |
| Settings | 数据导出(loading) | ✅ SVG 30 | PNG | PNG | PNG |
| Settings | 清空数据二次确认 | PNG | PNG | PNG | PNG |

---

## 3. AI 出图 Prompt 模板

把下面任一模板粘贴到 v0.dev / Stitch / Galileo AI / Figma AI,即可生成对应高保真 mockup。**已使用 PairFit 真实 token**(色板 / 字体 / 圆角 / 阴影)。

### 3.1 通用前缀(每个 prompt 必带)

```
Style: Mobile-first, 390×844 viewport (iPhone 14 Pro reference).
Design system: Inter font (latin) or Noto Sans SC (CJK); brand color coral
#FF6B6B for partner A; accent teal #14B8A6 for partner B; surface #FFFFFF
(light) / #0C0A09 (dark); rounded corners 12-24px; soft shadows.
Component library: Tailwind CSS. Icons: Lucide 1.8px stroke.
Typography hierarchy: page title 24px/700, card title 16px/600, body 14px,
caption 12px.
Tone: warm, friendly, not corporate. Empty states must include emoji +
a clear next-action CTA.
```

### 3.2 Onboarding · 目标设定(英文 · 浅色)

```
[Prefix] Page: PairFit onboarding step 1 — choose direction.
Layout: top progress bar "Step 1 of 3", title "What's your goal?",
two large cards side-by-side: "Lose weight" (down arrow icon, brand
coral) and "Gain weight" (up arrow icon, accent teal). Below: input
fields for start weight, target weight, weekly pace slider.
Bottom: Primary CTA "Next" (coral, full width, 48px).
Empty state: none — this is a required step.
```

### 3.3 Home · 今日打卡(中文 · 浅色)

```
[Prefix] Page: PairFit home tab — today's check-in (Chinese).
Layout: top page header "今日打卡 · 周三", two progress cards side-by-side
(coral for 你, teal for ta), three modules below (体重 / 饮食 / 运动)
each as a 96px tall card with icon + today's value + CTA "记一笔".
Voice mic button (coral, 56px round) floating bottom-right.
Bottom tab bar 5 items, home tab active (coral pill background).
Empty state: if no records yet, replace three modules with a single
"🎯 今天还没记录" empty card + CTA.
```

### 3.4 Couple · 未绑定(英文 · 深色)

```
[Prefix] Page: PairFit couple tab — unbound state (English, dark theme).
Layout: page header "Couple", large hero card with blurred gradient
halo (coral + teal), big heart icon, title "Bind with your partner",
description "Pair up to share progress, coins and challenges.", two
CTAs: "Generate invite code" (primary coral) and "How it works"
(outline). Below: 2x2 grid of feature cards (Shared goals / Coins &
cheers / Voice notes / Private & local).
```

### 3.5 RecordFood · AI 估算(英文 · 浅色)

```
[Prefix] Page: RecordFood — AI food estimate result (English, light).
Layout: top page header "What did you eat?", voice transcript pill
"I had chicken rice and milk tea", AI estimate card with item list
("🍗 Chicken rice · ~550 kcal", "🥤 Milk tea · ~250 kcal"), macro bars
(protein/carbs/fat), confidence badge "AI estimate, you can edit",
confirm CTA "Save 800 kcal" (accent teal, full width).
Note: explicit disclaimer text small "Estimate is ±25%. Tap any item
to adjust."
```

### 3.6 Subscription · 解锁 Pro(中文 · 深色)

```
[Prefix] Page: PairFit subscription — Pro paywall (Chinese, dark).
Layout: hero gradient (coral → teal) header with crown icon, title
"解锁 Pro", two-column feature list with checkmark icons (无广告 / AI
周报 / 自定义主题 / 高级曲线 / 数据云同步). Pricing table: $4.99/月 vs
$29.99/年, couple badge "1 人付费 = 2 人解锁". Bottom CTA "模拟订阅"
(secondary button — MVP doesn't take payment yet). Footer disclaimer
"Pro 由真实支付激活后将自动启用". Dark theme: bg #0C0A09.
```

---

## 4. 如何用本 manifest

- **PM(我)**:拿到本 manifest 后,可批量去 v0.dev 出 PNG。30 张 SVG 已能验证设计意图,PNG 用于"像素级验收"。
- **Coding Agent**:先读 SVG 线框理解布局,再读对应 `pages/<name>.md` 拿细节,然后按 `design-tokens.json` 配置 Tailwind。
- **设计 Agent(下一轮)**:用本 manifest 作 backlog,补齐剩余 ~50 张 PNG mockup。

---

## 5. 已知限制(诚实声明)

- 本交接包提供 **30 张 SVG 线框 + 80+ 项 PNG backlog**,而非"已完成的 80-120 张 PNG"。
- PNG 需要在 v0 / Stitch / Galileo AI / Figma AI 中产出;本环境无可用图像生成工具。
- SVG 线框已标注 token、版式、文案,可直接被 Coding Agent 解读为 React/Tailwind 实现。