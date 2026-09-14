# PairFit · 情侣双向健身 App

> **状态**:PF-1 脚手架完成 ✅ · PRD 见 [`docs/pairfit-prd-mvp.md`](docs/pairfit-prd-mvp.md)
> **Vercel Demo**:https://pairfit-mvp.vercel.app (在 Vercel 后台导入此 repo 即可自动部署)

## 一句话定位
海外发布的 C 端健身 App,**主打"情侣 1v1 协作健身 + 双向目标 + 虚拟币奖惩 + 语音优先输入"**,不框死单人用户。

## 核心差异点(市场空白)
- **没有 App 同时做**"双向目标 + 情侣协作 + 语音输入 + 虚拟币奖惩"
- 现有 App(MyFitnessPal / Lose It / Strava / Finch)都只覆盖其中一个维度

## MVP 范围(M1)
- Web 单页(Vite + React + TS + Tailwind)
- 单人记录 + 情侣绑定协作(两模式并存)
- 三大记录:体重 / 饮食 / 运动
- 语音输入(微信长按说话式)+ AI 食物估算(粗估 ±25%)
- 虚拟币(Coins)奖惩 + 双方确认制
- 免费基础 + Pro 订阅(1 人付费 = 2 人解锁)
- 英文为主 + 中文二档

## 里程碑
- **M0 立项**:✅ PRD 通过 + 仓库创建
- **M1 Web MVP**:进行中(PF-1 ✅ · PF-2 ~ PF-10 待启动)
- **M2 灰度发布**:2 周
- **M3 放量 + V1.1**(iOS + Android 原生 + 真实支付 + 云同步):4 周
- **M4 复盘**

---

## 🛠 技术栈(PF-1 已锁定)

| 层 | 选型 | 说明 |
|---|---|---|
| 脚手架 | Vite 8 + React 19 + TypeScript 5.8 | 官方 `react-ts` 模板 |
| 样式 | Tailwind CSS 3.4 + 自定义设计系统 | 暗色走 `class` 策略 |
| 状态 | Zustand 5(带 `persist` 中间件) | 主题 / 语言偏好进 localStorage |
| 路由 | React Router 6 | 5 个底部 Tab SPA 路由 |
| i18n | react-i18next + i18next-browser-languagedetector | 默认英文,中文二档 |
| 图标 | lucide-react | Tree-shakable SVG |
| 部署 | Vercel(免费层) | `vercel.json` 已写好 SPA rewrite |

**设计系统**(`src/components/ui/` + `tailwind.config.ts`):
- 配色:品牌 coral (`brand-*`) + 强调 teal (`accent-*`) + 语义 success/warning/danger/info
- 字体栈:`Inter`(英文)+ `PingFang SC / Noto Sans SC`(中文)
- 圆角:`6 / 8 / 12 / 16 / 24 / 32` px,按钮/卡片/胶囊
- 阴影:5 级 `xs / sm / DEFAULT / md / lg`,加 `glow` / `glow-accent`
- 动效:`ease-out-quart` 200–300ms;按钮按下 `scale(0.98)`;骨架 shimmer
- 安全区:`pb-[env(safe-area-inset-bottom)]`,TabBar 兼容 iOS 小黑条
- 暗色:CSS 变量驱动(`rgb(var(--bg-app))` 等),亮暗同步切换无闪烁

---

## 🚀 本地开发

```bash
# 第一次开工
gh repo clone xie-tw/pairfit-mvp
cd pairfit-mvp
npm install

# 启动 dev server
npm run dev                 # http://127.0.0.1:5173

# 类型检查 / lint / 构建
npm run typecheck           # tsc -b --pretty
npm run lint                # oxlint
npm run build               # tsc -b && vite build  → dist/

# 预览生产构建
npm run preview             # http://127.0.0.1:4173
```

> 默认端口被占用时,Vite 会自动选下一个可用端口(5180、5181 …)。

## ☁️ Vercel 部署

`vercel.json` 已经写好(Vite 框架识别 + SPA rewrite + 静态资源缓存),两种部署方式:

**A. GitHub 集成(推荐)**
1. 在 Vercel 控制台点击 **Add New → Project**,选 `xie-tw/pairfit-mvp`
2. Framework Preset 自动识别为 **Vite**
3. Build / Install / Output 命令全部默认即可,点击 Deploy
4. 之后每次 `git push origin main` 自动触发 preview + production

**B. Vercel CLI**
```bash
npm i -g vercel
vercel link --yes          # 第一次关联项目
vercel                     # 部署 preview
vercel --prod              # 部署生产
```

---

## 📂 项目结构

```
pairfit-mvp/
├── public/
│   └── favicon.svg          # 自绘 PairFit logo
├── src/
│   ├── App.tsx              # 路由 + 主题初始化
│   ├── main.tsx             # 入口:StrictMode + BrowserRouter
│   ├── index.css            # Tailwind + 设计 token(亮 / 暗 CSS 变量)
│   ├── i18n/
│   │   ├── index.ts         # i18next 配置
│   │   └── locales/{en,zh}.json
│   ├── store/
│   │   ├── theme.ts         # Zustand:light/dark/system,DOM 同步
│   │   └── locale.ts        # Zustand:en/zh,推送给 i18next
│   ├── lib/utils.ts         # cn() — clsx + tailwind-merge
│   ├── components/
│   │   ├── layout/{AppShell,TopBar,TabBar}.tsx
│   │   └── ui/{Button,Card,PageHeader,EmptyState}.tsx
│   └── pages/
│       ├── Home.tsx         # 首页:你的进度 + 伙伴的进度 + 今日目标
│       ├── Records.tsx      # 记录入口:体重/饮食/运动
│       ├── Couple.tsx       # 情侣绑定 + 4 张特性卡
│       ├── Trends.tsx       # 周柱状图占位 + Best streak / Avg week
│       └── Me.tsx           # 个人中心 + 主题/语言切换 + 设置列表
├── tailwind.config.ts       # 设计 token(色板 / 字体 / 间距 / 圆角 / 阴影 / 动效)
├── postcss.config.js
├── vercel.json              # SPA rewrite + 静态资源缓存
├── tsconfig.{json,app,node}.json
├── vite.config.ts
└── package.json
```

---

## 🌗 主题与语言

- **主题**:亮 / 暗 / 跟随系统(三态循环)。状态进 `localStorage:pairfit:theme`。
- **语言**:English ⇄ 中文。状态进 `localStorage:pairfit:locale`。
- 首次访问:主题跟系统,i18n 探测器会读浏览器偏好 → 默认英文。
- 切换是即时的,无刷新,无闪烁(`onRehydrateStorage` 在挂载前先把 DOM 染好)。

## 🌐 浏览器兼容

| 浏览器 | 版本 | 说明 |
|---|---|---|
| Safari | 16+ | 完整支持,含暗色 + 系统跟随 |
| Chrome / Edge | 109+ | 完整支持 |
| Firefox | 115+ | 完整支持 |
| 移动 Safari | iOS 16+ | iOS 16+ 支持 `:has()` / `color-scheme` |
| WebView | Android 10+ | OK |

不依赖任何尚未普及的特性:`backdrop-filter` 走渐进增强(关掉就降级成纯色背景)。

---

## 🚧 已知限制(PF-1 范围)

- 数据全 hardcode / 占位 — 真实业务数据(PF-3 ~ PF-9)接入后会用 Zustand + localStorage
- 5 个 Tab 页面都是骨架 — 真实功能按 PRD 的 PF 拆分陆续落地
- Vercel 部署链接需在 Vercel 后台手动导入一次(本仓库无 Vercel token,无法自动 link)
- Tailwind v3,v4 配置差异大 — 本项目**只**支持 v3(`darkMode: 'class'` 在 v4 下需换成 `@variant dark`)

## 编码助手工作入口

请按 Multica issue **STUD-77 [PF-1]** 完成验收,然后:
- 在 STUD-77 评论贴 commit hash + Vercel preview URL
- 不要写到其他项目目录(硬规则)

## 详细 PRD
见 [`docs/pairfit-prd-mvp.md`](docs/pairfit-prd-mvp.md)— 包含:
- 16 节:背景 / 画像 / 竞品 / 范围 / 用户故事 / 页面流程 / Onboarding / AARRR / 实验 / 非功能 / 指标 / 商业化 / 风险 / 里程碑 / 待确认 / 一次性交付清单
- 12 个用户故事(给定-当-则)
- 完整 localStorage 数据结构
- 10 个子 issue 拆分(PF-1 ~ PF-10)
