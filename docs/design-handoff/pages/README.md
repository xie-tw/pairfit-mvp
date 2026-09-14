# PairFit · 页面规格清单

> 版本:v1.0 · 2026-09-14

## 页面目录

| 文件 | 路由 | 用途 | 实现 milestone |
|---|---|---|---|
| [register.md](./register.md) | `/register` | 新用户注册 | ✅ PF-2 |
| [login.md](./login.md) | `/login` | 老用户登录 | ✅ PF-2 |
| [forgot-password.md](./forgot-password.md) | `/forgot-password` | 找回密码(MVP mock) | ✅ PF-2 |
| [onboarding.md](./onboarding.md) | `/onboarding` | 目标设定(3 步) | 🆕 PF-3 |
| [home.md](./home.md) | `/` | 今日打卡首页 | 🔧 PF-1 + PF-3 |
| [record-weight.md](./record-weight.md) | `/records/weight` | 体重录入 | 🆕 PF-3 |
| [record-food.md](./record-food.md) | `/records/food` | 饮食录入 + AI 估算 | 🆕 PF-4 |
| [record-exercise.md](./record-exercise.md) | `/records/exercise` | 运动录入 | 🆕 PF-5 |
| [couple-bind.md](./couple-bind.md) | `/couple` (未绑) / `/couple/bind` | 邀请码生成 + 输入 | 🆕 PF-6 |
| [couple-bound.md](./couple-bound.md) | `/couple` (已绑) / `/couple/bound` | 情侣协作页 | 🆕 PF-6 |
| [trends.md](./trends.md) | `/trends` | 三张曲线 + AI 周报 | 🆕 PF-8 |
| [me.md](./me.md) | `/me` | 我的 Tab | ✅ PF-1 + PF-2 |
| [subscription.md](./subscription.md) | `/me/subscription` | Pro 解锁 + 模拟订阅 | 🆕 PF-9 |
| [profile.md](./profile.md) | `/me/profile` | 个人资料编辑 | ✅ PF-2 |
| [settings.md](./settings.md) | `/me/settings` | 单位 / 数据 / 隐私 | 🆕 PF-9 |
| [help.md](./help.md) | `/me/help` | FAQ + 反馈 | 🆕 PF-9 |

---

## 规格章节说明

每份页面规格包含以下五段:

1. **目的** — 这页解决什么问题 / 给谁用
2. **布局** — ASCII 线框,标注关键元素位置
3. **元素清单** — 列出用到的组件 / 内容
4. **交互** — 用户操作 → 行为
5. **异常态** — 空 / 加载 / 错误 / 成功 4 态描述
6. **i18n** — 涉及的翻译 key 列表
7. **A11y** — 屏幕阅读器 / 键盘 / 对比度注意事项

---

## 全局设计原则(适用于所有页面)

- **移动优先**:所有页面在 390×844(iPhone 14 Pro)viewport 下设计。
- **1 拇指可达**:主 CTA 永远在屏幕底部(`fixed bottom-20`)或卡片下方。
- **3 步完成核心任务**:不要让用户在 5 个步骤里走完一个录入流程。
- **空态要有 CTA**:不要让用户看到空白;永远给"下一步"。
- **错误要给出路**:每个错误状态 + "重试 / 去登录 / 手动填" 之一。
- **可访问性硬要求**:触控目标 ≥44pt、label 永远可见、prefers-reduced-motion 兼容。