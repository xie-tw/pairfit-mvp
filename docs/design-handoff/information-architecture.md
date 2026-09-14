# PairFit · 信息架构与用户旅程

> 版本:v1.0 · 2026-09-14
>
> 本文档把 PRD §6「核心流程与页面」翻译成具体路由 / 导航 / 模态 / Mermaid 流程图,给 Coding Agent 接续实现用。

---

## 1. 路由表

| Path | Page | 权限 | 进入方式 |
|---|---|---|---|
| `/login` | Login | 公开 | 深链 / 注册成功 |
| `/register` | Register | 公开 | 启动 / TopBar Sign in |
| `/forgot-password` | ForgotPassword | 公开 | Login "Forgot?" 链接 |
| `/onboarding` | Onboarding | 公开 | Register 成功后 `replace` 跳转 |
| `/` | Home | RequireAuth | Tab 默认页 |
| `/records` | Records | RequireAuth | Tab |
| `/records/weight` | RecordWeight | RequireAuth | Records 卡 → |
| `/records/food` | RecordFood | RequireAuth | Records 卡 → |
| `/records/exercise` | RecordExercise | RequireAuth | Records 卡 → |
| `/couple` | Couple | RequireAuth | Tab |
| `/couple/bind` | CoupleBind | RequireAuth | Couple 主页"绑定"CTA |
| `/couple/bound` | CoupleBound | RequireAuth | 已绑定后 Couple 主页 |
| `/trends` | Trends | RequireAuth | Tab |
| `/me` | Me | 公开(已登录显示账号卡片) | Tab |
| `/me/profile` | Profile | RequireAuth | Me "Profile" 行 |
| `/me/subscription` | Subscription | RequireAuth | Me "Subscription" 行 |
| `/me/settings` | Settings | RequireAuth | Me "Settings" 行 |
| `/me/help` | Help | 公开 | Me "Help" 行 |
| `*` | NotFound | 公开 | 兜底 |

> Tab 路由(`/`, `/records`, `/couple`, `/trends`, `/me`)由 `<AppShell>` 包住,带 TopBar + TabBar。
> 非 Tab 路由(`/records/weight`, `/couple/bind`, `/profile`, …)也走 `<AppShell>`,但隐藏 TabBar(用 `<AppShell hideTabBar>`)。

---

## 2. 信息架构(Mermaid)

```mermaid
graph TD
  App[PairFit App]
  App --> Auth{已注册?}
  Auth -- 否 --> RegFlow[注册流]
  Auth -- 是 --> Onboard{已设目标?}
  RegFlow --> Onboard
  Onboard -- 否 --> Onboarding[Onboarding<br/>目标设定]
  Onboard -- 是 --> Shell[App Shell<br/>5 个 Tab]
  Onboarding --> Shell

  Shell --> Home[Tab · Home<br/>今日打卡]
  Shell --> Records[Tab · Records<br/>三模块入口]
  Shell --> Couple[Tab · Couple<br/>情侣绑定 + ta 的进度]
  Shell --> Trends[Tab · Trends<br/>三张曲线]
  Shell --> Me[Tab · Me<br/>账号 + 设置]

  Records --> RecordWeight[记录 · 体重]
  Records --> RecordFood[记录 · 饮食]
  Records --> RecordExercise[记录 · 运动]

  Couple --> CoupleBind{已绑定?}
  CoupleBind -- 否 --> CoupleBindPage[绑定页<br/>生成/输入邀请码]
  CoupleBind -- 是 --> CoupleBoundPage[情侣协作页<br/>ta 的卡片 + 鼓励]
  CoupleBindPage --> InviteSheet[分享 sheet<br/>24h 过期]

  Me --> Profile[Profile<br/>头像 / 昵称 / 单位 / 语言]
  Me --> Subscription[Subscription<br/>Pro 解锁 + 模拟订阅]
  Me --> Settings[Settings<br/>单位 / 语言 / 导出 / 清空]
  Me --> Help[Help & Feedback]
```

---

## 3. 主导航结构

### 3.1 移动端底部 Tab Bar(5 个)

固定在底部,`sticky bottom-0`,带 safe-area inset。激活态:icon 缩放 1.1,label 出现,背景 pill 用 `brand-100`。

```
┌─────────────────────────────────────────────────┐
│  🏠      📝      💕      📈      👤              │
│ Home  Records  Couple  Trends   Me               │
│  ↑                                                 │
│  brand-100 pill (active)                          │
└─────────────────────────────────────────────────┘
```

### 3.2 顶部 TopBar

固定在顶部,`sticky top-0`,透明 backdrop-blur。左侧 brand,右侧 Language toggle + Theme toggle + User menu(或 Sign in pill)。

### 3.3 模态 / Bottom Sheet 用法

- **Modal**(中心弹出):用 `pf-modal` 类,仅用于"危险确认"(解绑 / 清空所有数据 / 取消订阅)。
- **Bottom Sheet**(底部抽屉):用 `pf-sheet` 类,用于"分享邀请码 / 选择图标 / 选择表情评论"。
- **Toast**(顶部浮层):用 `pf-toast` 类,用于所有"操作反馈"提示(成功 / 警告 / 错误)。

---

## 4. 关键用户旅程(Mermaid)

### 4.1 首次注册 → 设定目标 → 第一次记录(Aha 时刻路径)

```mermaid
sequenceDiagram
  autonumber
  actor User as 新用户
  participant Reg as Register
  participant Onb as Onboarding
  participant Rec as RecordWeight
  participant Home as Home

  User->>Reg: 填邮箱 + 密码 + 昵称 + 头像
  Reg-->>User: 校验通过 → 注册成功
  Reg->>Onb: navigate('/onboarding', replace)
  Note over Onb: 🎯 Aha 候选 1:目标曲线动效出现
  User->>Onb: 选方向(减/增)+ 起始 / 目标体重 + 节奏
  Onb-->>User: 生成"预计达成日期"预览
  User->>Onb: 点"开始记录"
  Onb->>Home: navigate('/', replace)
  Note over Home: 🎯 Aha 候选 2:首页"今日打卡"卡片出现
  User->>Home: 点"体重"模块
  Home->>Rec: navigate('/records/weight')
  User->>Rec: 长按语音,说"今天 65.5 公斤"
  Rec-->>User: 松开 → 自动填入 → 点保存
  Note over Rec: 🎉 第一条记录成功 → 庆祝弹层<br/>"你已超越 80% 的首次用户"
  Rec->>Home: navigate('/')
  Home-->>User: 进度条推进 + 提示"邀请 ta 一起"
```

### 4.2 情侣绑定路径

```mermaid
sequenceDiagram
  autonumber
  actor User as 用户 A
  actor Partner as 用户 B
  participant Couple as Couple Tab
  participant Bind as CoupleBind
  participant PartnerCouple as Partner 端
  participant Bound as CoupleBound

  User->>Couple: 进入 Tab
  alt 未绑定
    Couple->>Bind: 点"生成邀请码"
    Bind-->>User: 6 位码 + 24h 倒计时 + 分享按钮
    User->>Partner: 把码发过去(微信 / 短信)
    Partner->>PartnerCouple: 登录 PairFit,粘贴邀请码
    PartnerCouple->>Bind: 同意绑定(本地校验)
    Bind-->>User: 收到"对方已接受"提示
    Bind->>Bound: 跳转情侣协作页
    Note over User, Bound: 💕 Aha 时刻:看到对方头像 + ta 的今日打卡
  end
```

### 4.3 语音录入 → AI 食物估算路径

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Mic as VoiceButton
  participant SR as Web Speech API
  participant AI as AI 估算服务
  participant Food as RecordFood

  User->>Mic: 长按
  Mic-->>User: pulse 动效 + 波形
  User->>Mic: "中午吃了鸡腿饭和一杯奶茶"
  Mic->>SR: start()
  SR-->>Mic: transcript "中午吃了鸡腿饭和一杯奶茶"
  Mic-->>User: 松手 → 自动填入
  Food->>AI: 解析 + 估算
  alt 成功(< 10s)
    AI-->>Food: [{name:"鸡腿饭",kcal:550}, {name:"奶茶",kcal:250}]
    Food-->>User: 显示估算卡 + 营养素条
    User->>Food: 点"确认保存"
    Food-->>User: 庆祝动效 + Coins 增加
  else 超时或失败
    Food-->>User: 降级为"区间估算" 600-1000 kcal,用户可手动填
  end
```

---

## 5. 路由来源表(每个页面的入口 / 出口)

| Page | 来源 | 出口 |
|---|---|---|
| Login | TopBar Sign in / Register "signInLink" / ForgotPassword "backToLogin" | Register · Home(成功后) |
| Register | Login "signUpLink" | Login · Onboarding(成功后) |
| ForgotPassword | Login "Forgot?" | Login |
| Onboarding | Register 成功(替换式) | Home(成功后) |
| Home | Tab 默认 | 各记录页 · Couple · Trends · Me |
| Records | Tab | 三个子录入页 |
| RecordWeight | Records 卡 · Home 体重模块 | Home |
| RecordFood | Records 卡 · Home 饮食模块 | Home |
| RecordExercise | Records 卡 · Home 运动模块 | Home |
| Couple | Tab | Bind · Bound |
| CoupleBind | Couple "绑定" CTA | Bound(成功后) |
| CoupleBound | 已绑定后 Couple | Me 邀请 ta |
| Trends | Tab | — |
| Me | Tab | Profile · Subscription · Settings · Help |
| Profile | Me "Profile" 行 | Me · Sign out → Login |
| Subscription | Me "Subscription" 行 | Me(确认后) |
| Settings | Me "Settings" 行 | Me |

---

## 6. 设计意图:为什么 IA 是这样

- **5 个 Tab = 5 个用户意图**:Home = "今天我要做什么"、Records = "我想记一笔"、Couple = "ta 在干嘛"、Trends = "我做到了吗"、Me = "我的设置"。每个 Tab 一个动词,心智模型清晰。
- **Records 子路由走全屏**:PF-3 的录入流需要专注,Tab 留在底部但不强提示;避免"输入中误触 Tab"丢失数据。
- **绑定页用独立路由**(非 Modal):因为 6 位邀请码 + 24h 倒计时 + 分享按钮需要稳定的"短链"形式,便于浏览器返回 / 分享。
- **危险操作走 Modal**:解绑 / 清空数据 / 取消订阅,二次确认 + 1 秒可撤销。