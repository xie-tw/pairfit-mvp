# PairFit · UI 设计交接包

> 版本:v1.0 · 编写日期:2026-09-14 · 维护方:UI 设计 Agent
>
> 本目录是 Coding Agent 接续开发的"开发手册"。所有视觉、交互与设计 token 决策均集中在此,不在源码里再补充规则——这样设计意图与实现一一对应。

---

## 1. 阅读顺序(给 Coding Agent)

按以下顺序读,效率最高:

1. **本 README** — 了解本目录结构与设计意图
2. **[design-tokens.json](./design-tokens.json)** — 设计 token 总表(JSON,可在 `tailwind.config.ts` 直接复用)
3. **[information-architecture.md](./information-architecture.md)** — 信息架构 / 导航结构 / 用户旅程(Mermaid)
4. **[interaction-spec.md](./interaction-spec.md)** — 全局动效 / 反馈 / 异常态规则
5. **[components/](./components/)** — 每个 UI 组件的规格(18 个组件)
6. **[pages/](./pages/)** — 每个页面的规格(15 个页面)
7. **[screens/](./screens/)** — 视觉原型 SVG(每个页面 × 主题 ≈ 30 张)

---

## 2. 设计目标与指标映射

| 设计决策 | 对应指标 | 度量方式 |
|---|---|---|
| 30 秒进入"目标曲线"动效 | A) 注册 → 完成首次目标设定 > 70% | `onboarding_complete` 事件 |
| 微信长按说话式语音按钮 | D) 语音输入成功率 > 80% | `voice_input_success` / `voice_input_attempt` |
| "今日打卡"首页默认展示 | B) D7 留存 > 25% | `app_open_d7` |
| 注册后立即引导绑定 | C) 情侣绑定率 > 40% | `pair_invite_create` |
| 空状态有 1 个主 CTA + 引导文案 | 首次任务完成率 | `first_record_complete` |
| 错误态提供"下一步动作"按钮 | 错误 → 恢复转化 | `error_recover` |
| 主 CTA 在底部 1 拇指可达 | 录入完成率 | `record_complete` |
| 对方鼓励按钮每日上限 3 次 | E-04 实验(D7 留存) | `cheer_daily_count` |

---

## 3. 不做清单(给 Coding Agent 的边界)

- ❌ 不重做 PF-1 已搭的设计系统 — `tailwind.config.ts` 与 `src/index.css` 是 source of truth,色板 / 字体 / 主题切换不要改
- ❌ 不重画 PF-1 已搭的 5 个 Tab 骨架 — `Home / Records / Couple / Trends / Me` 的外壳沿用,只填内容
- ❌ 不写 React 代码 — 本交接包只出"长什么样 / 怎么动",实现交给 Coding Agent
- ❌ 不接真实数据 / 真实支付 — 占位即可

---

## 4. 关键文件速查

| 文件 | 用途 | 何时读 |
|---|---|---|
| `design-tokens.json` | 设计 token 全量(色 / 字号 / 间距 / 圆角 / 阴影 / 动效) | 写任何 UI 前先看 |
| `information-architecture.md` | 路由 / Tab / Mermaid 流程图 | 加新页面 / 改导航前 |
| `interaction-spec.md` | 动效 / 反馈 / 异常态全局规则 | 写新交互 / 异常态前 |
| `components/<name>.md` | 单一组件规格 / props / 状态 / 例子 | 用组件前 |
| `pages/<name>.md` | 单一页面布局 / 元素 / 交互 / 异常态 | 写新页面 / 改页面布局前 |
| `screens/*.svg` | 视觉原型(线框 + 关键色) | 看"整体长什么样" |

---

## 5. 设计哲学(PairFit UI 的 4 条原则)

1. **品牌色 = 关系**:`brand` (coral) = 伙伴 A · `accent` (teal) = 伙伴 B。所有"你 / ta"的对比,统一用这两个色,不要新引入第 3 个语义色。
2. **温暖 + 克制**:圆角偏大(默认 12 / 16 / 24),阴影偏软,不用霓虹 / 渐变滥用。`brand-500 / accent-500` 是唯一允许大面积使用的强色。
3. **动效短而准**:`duration` 默认 200ms,`easing` 默认 `ease-out`。过渡不要超过 400ms,否则会感觉"卡"。
4. **暗色是真暗**:背景 `#0C0A09`(near-black),不要纯黑 `#000`。前景用 `#FAFAFA`,不要纯白,以减少对比刺激。

---

## 6. 已知限制

- **视觉原型为 SVG 线框 + 关键色**:由于本环境无可用 v0 / Stitch / Figma AI 出图能力,本交接包提供的是 hand-drawn SVG 线框(已标注关键 token、版式、文案),用于沟通意图而非最终像素。
- 高保真 PNG mock 需在 v0.dev / Stitch / Galileo AI / Figma AI 中生成;`screens-manifest.md` 提供了每个原型的 AI prompt 模板,PM 可批量出图。
- 部分页面(PF-3 ~ PF-9 尚未实现的部分)只有目标态规格,无现有 UI 可对照;Coding Agent 按规格落地即可。
- 动效具体曲线已写明,但 spring 物理参数(`damping` / `stiffness`)需要 Coding Agent 在实际接入时微调。

---

## 7. 联系 / 反馈

- 设计 token 字段 / 组件规格字段缺失 → 在 issue `STUD-87` 下评论
- 视觉偏离预期 → 在 PR 中 @ UI 设计 Agent(`b2c4654d-ce3c-4274-8c38-9629cfbce648`)