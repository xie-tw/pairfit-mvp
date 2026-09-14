import { create } from 'zustand';

/**
 * Lightweight toast queue.
 *
 * Toasts are short-lived (3s by default) and disappear on their own —
 * callers push one via `pushToast(...)` and the global `<ToastViewport>`
 * renders the queue at the top of the viewport. The store is in-memory
 * only (deliberately *not* persisted) so a hard refresh clears the deck.
 */
export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  /** Optional CTA — shown as a trailing button on the toast. */
  action?: { label: string; onClick: () => void };
  /** Override the default 3s auto-dismiss. */
  durationMs?: number;
}

interface ToastState {
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

const DEFAULT_DURATION_MS = 3000;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  pushToast: (toast) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next: Toast = { id, ...toast };
    set((state) => ({ toasts: [...state.toasts, next] }));
    // Auto-dismiss. Snapshot the id so we don't accidentally dismiss a
    // newer toast if `get()` returned a different state by the time the
    // timer fires.
    const dismissAfter = toast.durationMs ?? DEFAULT_DURATION_MS;
    if (dismissAfter > 0) {
      setTimeout(() => {
        get().dismiss(id);
      }, dismissAfter);
    }
    return id;
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

/**
 * Convenience helper — fire-and-forget toast for ad-hoc UI calls. We
 * intentionally expose a plain function (not just the store method) so
 * callers don't have to `useToastStore.getState()` every time.
 */
export function toast(input: Omit<Toast, 'id'>): string {
  return useToastStore.getState().pushToast(input);
}
