# BottomSheet

> 🆕 需新增 — 路径 `src/components/ui/BottomSheet.tsx`。PF-6 情侣表情评论 / PF-6 分享邀请码用。

## 用途

从底部滑入的抽屉,适合"轻量选择"(表情 / 分享方式 / 多选项)。比 Modal 更轻量、更移动端友好。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `open` | `boolean` | — | 受控开关 |
| `onClose` | `() => void` | — | 关闭回调 |
| `title` | `string` | — | 标题 |
| `snapPoints` | `Array<'25%' \| '50%' \| '90%'>` | `['50%']` | 移动端可选高度(桌面端忽略) |
| `children` | `ReactNode` | — | 内容 |
| `dismissible` | `boolean` | `true` | 拖下 / backdrop 点击关闭 |

## 视觉

- **Backdrop**:同 Modal,`bg-black/40`,fade-in 200ms。
- **Sheet**:`bg-surface rounded-t-2xl`,从底部 100% 滑入(`translateY(100%) → 0`),280ms ease-out-quart。
- **顶部把手**:12px 宽、4px 高、灰色横条,圆角,`mt-2`(给用户"可拖"暗示)。
- **标题区**:`px-4 pt-4 pb-3 border-b`,`text-base font-semibold`。
- **内容区**:`px-4 py-4 max-h-[60vh] overflow-y-auto`。
- **移动端**:`padding-bottom: env(safe-area-inset-bottom)`(避免 home indicator 遮挡)。
- **桌面端(> md)**:居中显示,`max-w-md`,圆角全(`rounded-2xl`),从下方 12px 滑入(等同 Modal 风格)。

## 状态

| 状态 | 行为 |
|---|---|
| **opening** | slide-up 280ms |
| **open** | `body` 加 `overflow-hidden`;焦点进入 sheet |
| **closing** | slide-down 200ms |

## 例子

```tsx
<BottomSheet
  open={showShareSheet}
  onClose={() => setShowShareSheet(false)}
  title={t('couple.bind.shareTitle')}
>
  <ul className="flex flex-col gap-2">
    <li>
      <button className="flex w-full items-center gap-3 ...">
        <Copy /> {t('couple.bind.copyCode')}
      </button>
    </li>
    <li>
      <button className="flex w-full items-center gap-3 ...">
        <Share2 /> {t('couple.bind.share')}
      </button>
    </li>
    <li>
      <button className="flex w-full items-center gap-3 ...">
        <QrCode /> {t('couple.bind.qr')}
      </button>
    </li>
  </ul>
</BottomSheet>
```

## 可访问性

- `role="dialog" aria-modal="true"`。
- 焦点 trap(打开时焦点进 sheet,关闭时回到触发元素)。
- 移动端支持向下拖动关闭(用 `@use-gesture/react` 或自己写 pointer 事件):向下拖 > 100px 关闭;拖动时背景跟随。

## 何时用 BottomSheet vs Modal

| 用 BottomSheet | 用 Modal |
|---|---|
| 表情评论选择 | 解绑二次确认 |
| 分享邀请码(多渠道) | 麦克风权限请求 |
| 单位 / 语言切换(临时) | AI 周报长文 |
| 详细筛选 | 数据导出确认 |