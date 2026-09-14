# CoupleRibbon

> 🆕 需新增 — 路径 `src/components/ui/CoupleRibbon.tsx`。PF-6 情侣协作用。

## 用途

情侣绑定状态条。展示在 CoupleBound 顶部,显示你和 ta 的头像 + 关系状态 + Coins 总数 + 解绑入口。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `me` | `{ displayName: string; avatar: string; coins: number }` | — | 当前用户 |
| `partner` | `{ displayName: string; avatar: string; coins: number }` | — | 对方用户 |
| `status` | `'active' \| 'unbinding'` | — | 关系状态 |
| `boundDays` | `number` | — | 已绑定天数 |
| `onCheer` | `() => void` | — | 鼓励按钮(发 emoji / +Coins) |
| `onUnbind` | `() => void` | — | 解绑(二次确认 modal 由父级处理) |
| `className` | `string` | — | 容器样式 |

## 视觉

- 容器:`<Card raised className="relative overflow-hidden">`,带 brand + accent 双色光晕(`absolute -right-12 -top-12 size-48 rounded-full bg-brand-100/60 blur-2xl` 镜像)。
- 顶部:`flex items-center gap-3`。
- 中部:你 + "&" + ta 的头像圆(48px),用渐线分隔。
- 状态条:右侧 `Badge variant="brand" icon={<Heart fill="current" />}>已绑定 {boundDays} 天</Badge>`。
- 下方:`flex items-center justify-between`,左侧 Coins 总数(`🪙 {sum}` 20px),右侧两个 icon button(鼓励 `<Smile />` + 更多 `<MoreHorizontal />`)。
- "更多"点开 BottomSheet:解绑 / 邀请 ta 重新生成码 / 隐藏 ta 的进度。

## 状态

| 状态 | 视觉 |
|---|---|
| **active** | 双色光晕正常,badge 显示 "已绑定 X 天" |
| **unbinding**(7 天冷却)| 光晕切 `bg-warning`,badge 显示 "解绑冷却中 · 还剩 X 天" |

## 例子

```tsx
<CoupleRibbon
  me={{ displayName: 'Mei', avatar: '🦊', coins: 124 }}
  partner={{ displayName: 'Aki', avatar: '🐱', coins: 87 }}
  status="active"
  boundDays={42}
  onCheer={() => cheerSheet.open()}
  onUnbind={() => unbindModal.open()}
/>
```

## 可访问性

- 头像 + 名字组合用 `<a>` 或 `<button>`(整卡可点击跳 ta 的详情页)。
- Coins 总数:`<span aria-label="total 211 coins">🪙 211</span>`。
- 解绑入口需要二次确认 modal(`dismissible={false}`),本组件只触发回调。