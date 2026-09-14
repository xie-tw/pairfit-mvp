# PairFit · 交互规范(全局动效 / 反馈 / 异常态)

> 版本:v1.0 · 2026-09-14
>
> 这是 Coding Agent 在写新页面 / 新交互前必读的规则。所有规则与现有 `src/index.css`(PF-1)兼容;`prefers-reduced-motion` 已全局处理。

---

## 1. 动效原则

### 1.1 时长

| 场景 | 时长 | 缓动 |
|---|---|---|
| 按钮 hover / press | 120-150ms | `out-quart` |
| 卡片 / 输入框 focus | 150-200ms | `out-quart` |
| 页面切换 / 模态进出 | 250-280ms | `out-quart` |
| 列表项 stagger | 60-80ms per item | `out-quart` |
| 庆祝弹层 / 进度曲线绘制 | 400-600ms | `spring · gentle` |
| 拖动 / 滑块 | 即时(0ms) | 无 |

> **不要超过 400ms**:移动端超过 400ms 的过渡会感觉"卡"。慢动作只允许用于"奖励性动效"(庆祝 / 完成)。

### 1.2 缓动曲线

- **默认** `cubic-bezier(0.25, 1, 0.5, 1)`(out-quart)— Tailwind class `ease-out-quart`。
- **进出模态** `cubic-bezier(0.76, 0, 0.24, 1)`(in-out-quart)— Tailwind class `ease-in-out-quart`。
- **弹性 / 弹簧**(庆祝弹层 / 鼓励按钮弹动)用 framer-motion 或 CSS `@keyframes`,参数见 `design-tokens.json → motion.spring`。

### 1.3 微交互清单(每个交互至少满足一项)

| 交互 | 视觉反馈 | 触觉反馈(移动端)|
|---|---|---|
| 按钮按下 | `active:scale-[0.98]` + 颜色加深 | `pf-press` 类已包含 |
| 表单提交 | button 内 spinner + `aria-busy` | — |
| 长按语音 | 麦克风按钮 pulse 环 + 波形 | `navigator.vibrate(50)` |
| 列表项点击 | 背景色 1 帧变化 | — |
| 滑动删除 / 撤销 | 顶部出现"已撤销"Toast 5s | — |
| 数字变化(Coins / 体重)| 数字 tween + 颜色闪烁 | — |
| 完成 / 庆祝 | 屏幕中心缩放弹层 + emoji 爆裂 | 短震动 `navigator.vibrate([20, 30, 20])` |

---

## 2. 反馈规则

### 2.1 100ms 原则

任何用户操作必须在 **100ms 内** 给出视觉反馈,否则用户会感觉"没点到"。具体落实:

- 按钮按下:立即 `active:scale-[0.98]`(已在 `pf-press`)。
- 长按语音:按下立即 pulse,不等 API 响应。
- 表单提交:submit 立即把 button 切到 loading(`Loader2` spinner),而不是等异步结果。

### 2.2 反馈三档

| 档位 | 场景 | 元素 |
|---|---|---|
| **即时反馈** | 按钮 / 链接 / 输入 | 颜色 / 缩放 / focus ring |
| **过程反馈** | loading / 进度 / 等待 | spinner / skeleton / progress bar |
| **结果反馈** | 成功 / 警告 / 错误 | Toast / Modal / 庆祝弹层 |

---

## 3. 异常态规则(全局)

### 3.1 网络 / 离线

- MVP 全本地,无网络。
- 任何"同步失败"的提示文案必须是**过去时**:"同步失败,数据保留本地",并给一个"重试"动作按钮。
- 不弹"网络错误,请检查网络"这种干瘪提示。

### 3.2 语音识别失败

```
失败分级:
- ERR_NO_SPEECH:用户没说话 → Toast "没听到声音,再试一次"
- ERR_NO_MATCH:听不懂 → Toast "没听清,再说一次",按钮自动恢复为"长按录音"
- ERR_NOT_ALLOWED:权限拒绝 → Modal "需要麦克风权限才能语音记录",含"去设置"按钮
- ERR_NETWORK:网络问题 → Toast "网络异常,试试文字输入",输入框 focus
```

任何语音失败 → 必须提供 **fallback**:自动切换到键盘输入(不强制用户重录)。

### 3.3 AI 食物估算

- **超时(>10s)**:降级为"区间估算 600-1000 kcal",让用户填实际值,UI 文案:"AI 没赶上,你可以手动填一下。"
- **识别为空**:同上,空估算卡片 + 输入框。
- **识别明显错(例如"鸡腿饭"算成 50 kcal)**:允许用户点"重新识别"或"手动调整",调整完才确认。

### 3.4 邀请码无效

- Toast "邀请码无效或过期",按钮变回"输入邀请码"。3 次错误后 30s 冷却。

### 3.5 未绑定用户访问情侣页

- 空状态 + 主 CTA "生成邀请码",次 CTA "跳过,先自己用"。

### 3.6 表单错误

- 每个错误必须有:
  - **位置提示**:红边 + 错误文案在该字段下方
  - **下一步动作**:聚焦首个错误字段;如果是"邮箱已注册"等已知错误,给"去登录"链接
- 不弹全局红色 alert 覆盖整个页面。

### 3.7 危险操作

- **解绑 / 清空所有数据 / 取消订阅**:Modal 二次确认 + "再想想"按钮 + 1 秒可撤销 Toast。
- 不允许在 Modal 里默认勾选"不再提醒"。

---

## 4. 加载态规范

### 4.1 页面级

- App Shell 路由切换 → `<TopBar>` 立即显示,内容区 `pf-skeleton`(shimmer 2s 循环)。
- 加载时长 < 200ms 不显示 skeleton(直接出内容)。

### 4.2 卡片级

- 数据未到时:卡片用 `pf-skeleton`,但保留卡片轮廓(用户知道这里会有内容)。
- 进度条用 shimmer,不用 spinner。

### 4.3 列表级

- 第一次加载:全列表 skeleton(5 行)。
- 下拉 / 上拉加载:底部小 spinner。

---

## 5. 空状态规范

每个列表 / 屏幕都必须有空状态(`EmptyState` 组件,PF-1 已实现)。

空状态三要素:
1. **emoji / 图标**(大,圆背景,中央)
2. **一句人话标题**(告诉用户"这里为什么空")
3. **一句解释 + 主 CTA**(告诉用户"下一步做什么")

例:
```
🎯      (56px emoji,圆背景)
今天还没记录
记录第一条体重,我们就能给你画曲线。
[记录体重] (主 CTA,primary)
```

不要用"暂无数据"这种干瘪文案。

---

## 6. 庆祝动效规范(完成关键任务时)

适用场景:
- 第一次成功记录任何东西
- 第一次绑定成功
- 第一次达成周目标
- 收到对方鼓励

动效三段:
1. **0-200ms**:屏幕中心 1.6x 缩放弹层 + 庆祝 emoji 🎉
2. **200-400ms**:emoji 飞出 + 粒子从中心扩散
3. **400-800ms**:背景模糊淡出,弹层停留,点任意位置消失

参考:Web 实现可用 framer-motion 的 `AnimatePresence` + `keyframes`。MVP 可用纯 CSS 实现简化版。

---

## 7. 可访问性(A11y)

- **触控目标 ≥ 44pt**(iOS) / **48dp**(Android):所有按钮 / 链接 / 列表项点击区。
- **键盘焦点**:`focus-visible:ring-2 ring-brand-500/60 ring-offset-2`(已在 `tailwind.config.ts` 默认)。
- **色弱友好**:进度条 / 状态色不能用纯红绿对比;必须配文字或图标。
- **VoiceOver / TalkBack 标签**:icon-only 按钮必须有 `aria-label`;emoji 必须 `aria-hidden`。
- **字号缩放**:使用相对单位(rem),不要 px;用户放大到 200% 时布局不能破。
- **prefers-reduced-motion**:全局 CSS 已处理,动效时长缩到 0.01ms。

---

## 8. 错误码 → 用户文案映射(全局)

| 错误码 | 用户看到的文案(en) | 用户看到的文案(zh) |
|---|---|---|
| `emailTaken` | That email is already registered. Try signing in. | 这个邮箱已经注册过了,试试登录。 |
| `invalidCredentials` | Email or password is incorrect. | 邮箱或密码不正确。 |
| `voiceNoSpeech` | Didn't catch that. Try again? | 没听到声音,再试一次。 |
| `voiceNoMatch` | Didn't catch that. Say it again? | 没听清,再说一次。 |
| `voiceDenied` | We need microphone access to record by voice. | 需要麦克风权限才能用语音记录。 |
| `voiceFallback` | Voice didn't work. Type it instead? | 语音没识别出来,用键盘输入试试。 |
| `aiTimeout` | AI is taking too long. Type the values yourself? | AI 没赶上,你可以手动填一下。 |
| `inviteInvalid` | That code is invalid or expired. | 邀请码无效或过期。 |
| `inviteExpired` | This invite has expired. Ask your partner for a new one. | 邀请码已过期,请对方重新生成。 |
| `pairAlreadyBound` | You're already paired with someone. | 你已经和别人绑定了。 |
| `unbindCooldown` | Unbinding locks new pairing for 7 days. Continue? | 解绑后 7 天内不能再绑定,继续吗? |
| `dataClearConfirm` | This permanently deletes all your data. Continue? | 这会永久删除所有数据,继续吗? |
| `networkOffline` | You're offline. We'll save locally and sync later. | 你已离线,数据先存本地,稍后同步。 |