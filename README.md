# PairFit · 情侣双向健身 App

> **状态**:PRD 已完成,等编码助手接入做 M1 Web MVP
> **PRD 全文**:[`docs/pairfit-prd-mvp.md`](docs/pairfit-prd-mvp.md)

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
- **M1 Web MVP**:3-4 周(PF-1 ~ PF-10)
- **M2 灰度发布**:2 周
- **M3 放量 + V1.1**(iOS + Android 原生 + 真实支付 + 云同步):4 周
- **M4 复盘**

## 编码助手工作入口

请按 Multica issue **STUD-77 [PF-1]** 开始干活:
- 新建代码到本仓库(`xie-tw/pairfit-mvp`)
- 完成 PR 后,在 STUD-77 评论贴 commit hash + Vercel URL
- 不要写到其他项目目录(硬规则)

## 已知限制(MVP)
- 数据全 localStorage,**不上传任何用户数据**(V1.1 加云同步)
- 同设备 / 同浏览器 profile 才能双人协作(无后端)
- 订阅按钮是"模拟订阅",不接真实支付(V1.1 接 Stripe / Apple Pay,等海外银行卡激活)
- iOS Safari 部分语音功能不支持(用 Web Speech API)

## 详细 PRD
见 [`docs/pairfit-prd-mvp.md`](docs/pairfit-prd-mvp.md)— 包含:
- 16 节:背景 / 画像 / 竞品 / 范围 / 用户故事 / 页面流程 / Onboarding / AARRR / 实验 / 非功能 / 指标 / 商业化 / 风险 / 里程碑 / 待确认 / 一次性交付清单
- 12 个用户故事(给定-当-则)
- 完整 localStorage 数据结构
- 10 个子 issue 拆分(PF-1 ~ PF-10)
