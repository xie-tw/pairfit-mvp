# Toast

> 🆕 需新增 — 路径 `src/components/ui/Toast.tsx`,含全局 store。PF-3+ 通用。

## 用途

顶部浮层短暂提示。所有"操作反馈"用 Toast(成功 / 警告 / 错误)。

## 用法(全局 store)

```tsx
import { toast } from '@/components/ui/Toast';

// 成功
toast({ variant: 'success', message: 'Saved!' });

// 警告
toast({
  variant: 'warning',
  message: t('errors.voiceNoMatch'),
  action: { label: 'Retry', onClick: () => tryAgain() },
});

// 错误(常驻更长)
toast({
  variant: 'error',
  message: 'AI estimate failed',
  description: 'You can edit the values yourself.',
  duration: 6000,
});

// 信息
toast({ variant: 'info', message: 'Invite code expires in 23h' });
```

## 视觉

- 容器:`fixed top-4 left-1/2 -translate-x-1/2 z-toast`,最多同时显示 3 个,stacked。
- 单个 toast:`bg-surface rounded-xl shadow-lg border px-4 py-3`,min-width 280px, max-width 480px。
- icon 16px,在最左侧,根据 variant 着色。
- 标题:`text-sm font-medium`,`text-fg-primary`。
- 描述:`text-xs text-fg-muted`,可选。
- CTA:`text-xs font-semibold text-brand-600`,右侧对齐。

| variant | icon | icon color | 左 border(4px) |
|---|---|---|---|
| `success` | `<CheckCircle2 />` | `success` | `success` |
| `warning` | `<AlertTriangle />` | `warning` | `warning` |
| `error` | `<AlertCircle />` | `danger` | `danger` |
| `info` | `<Info />` | `info` | `info` |

## 动效

- **进入**:`translateY(-100%) → 0` + fade-in,280ms ease-out-quart。
- **退出**:`translateY(0 → -100%)` + fade-out,200ms。
- 自动消失:默认 `duration: 4000ms`(success / info),`6000ms` for warning / error。可传入 0 表示需手动关闭。
- 多个同时存在时,新 toast 出现在现有 toast 下方(stacked)。

## 例子(完整 Toast 组件伪代码)

```tsx
// src/store/toast.ts
type ToastVariant = 'success' | 'warning' | 'error' | 'info';
interface ToastItem {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}
interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (t) => {
    const id = crypto.randomUUID();
    const item = { duration: 4000, ...t, id };
    set((s) => ({ items: [...s.items, item].slice(-3) }));
    if (item.duration! > 0) {
      setTimeout(() => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      }, item.duration);
    }
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export const toast = (t: Omit<ToastItem, 'id'>) =>
  useToastStore.getState().push(t);
```

## 可访问性

- 容器 `role="region" aria-label="Notifications"`,多个 toast 用 `aria-live="polite"`。
- success / info 不用 `assertive`(不打断 SR 当前读屏);error / warning 用 `aria-live="assertive"`。
- 用户点 "×" 或 CTA 按钮时,toast 立即消失。
- 不要用 toast 承载必读的错误(用 Modal)— toast 4 秒就消失了,用户可能错过。