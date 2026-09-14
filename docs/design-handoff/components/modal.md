# Modal

> 🆕 需新增 — 路径 `src/components/ui/Modal.tsx`。PF-3+ 通用。

## 用途

中心弹出对话框。仅用于"危险操作二次确认"(解绑 / 清空数据 / 取消订阅)或"权限请求"(麦克风)。

> 一般确认 / 信息提示用 `Toast`;长列表选择用 `BottomSheet`。Modal 不要滥用。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `open` | `boolean` | — | 受控开关 |
| `onClose` | `() => void` | — | 关闭回调(必填) |
| `title` | `string` | — | 标题 |
| `description` | `ReactNode` | — | 描述段 |
| `children` | `ReactNode` | — | 内容(可选,部分 Modal 不需要) |
| `primaryAction` | `{ label: string; onClick: () => void; variant?: ButtonVariant; loading?: boolean }` | — | 主操作 |
| `secondaryAction` | `{ label: string; onClick?: () => void; variant?: ButtonVariant }` | — | 次操作 |
| `dismissible` | `boolean` | `true` | 点 backdrop / Esc 是否关闭(危险操作可设 `false`) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 卡片宽 `max-w-sm / md / lg` |

## 视觉

- **Backdrop**:`bg-black/40 backdrop-blur-sm`,fade-in 200ms。
- **卡片**:`bg-surface rounded-2xl shadow-lg`,从下方 12px 滑入(`@keyframes slide-up` 280ms)。
- **尺寸**:`max-w-sm`(320px)/ `max-w-md`(384px)/ `max-w-lg`(512px),`w-[calc(100vw-32px)]` 保证移动端不溢出。
- **标题**:`text-lg font-semibold`。
- **描述**:`text-sm text-fg-muted`,`mt-2`。
- **按钮区**:`mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end` — 移动端主 CTA 在底部;桌面端主 CTA 在右。

## 状态

| 状态 | 行为 |
|---|---|
| **opening** | fade-in + slide-up 280ms |
| **open** | 焦点自动移到第一个按钮;`body` 加 `overflow-hidden` |
| **closing** | fade-out 200ms,然后卸载节点(用 `AnimatePresence` 或自己管理 `unmounting` state) |

## 例子

```tsx
// 危险操作
<Modal
  open={showUnbindModal}
  onClose={() => setShowUnbindModal(false)}
  title={t('couple.unbind.title')}
  description={
    <>
      <p>{t('couple.unbind.body')}</p>
      <p className="mt-2 text-xs text-warning">
        {t('errors.unbindCooldown')}
      </p>
    </>
  }
  primaryAction={{
    label: t('couple.unbind.confirm'),
    variant: 'danger',
    onClick: () => doUnbind(),
    loading: unbinding,
  }}
  secondaryAction={{
    label: t('common.cancel'),
    variant: 'ghost',
    onClick: () => setShowUnbindModal(false),
  }}
  dismissible={false}  // 必须显式确认
/>
```

## 可访问性

- 用 `<dialog>` 元素 + 显式 `role="dialog" aria-modal="true" aria-labelledby="<title-id>"`。
- 打开时焦点自动到第一个按钮(默认 primary)。
- `Esc` 关闭(若 `dismissible`)。
- 关闭后焦点回到触发按钮。
- 移动端底部安全区:`pb-safe`(已在 `design-tokens.spacing` 暴露 `safeBottom`)。
- 点击 backdrop 关闭:`dismissible=true` 时允许;危险操作 `false`。

## 与 BottomSheet 的区别

| 用 Modal | 用 BottomSheet |
|---|---|
| 危险确认 | 表情评论选择 |
| 权限请求 | 分享邀请码 |
| 简短信息确认 | 列表 / 多选项 |