import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToastStore, type Toast as ToastItem } from '../../store/toast';
import { cn } from '../../lib/utils';

/**
 * Renders the toast queue at the top of the viewport. The component is
 * mounted once at the app root (`<App>`) and subscribes to the queue;
 * individual toasts push themselves via the `toast()` helper or the
 * `useToastStore` directly.
 *
 * Visual map:
 *   success  → brand (positive confirmation)
 *   error    → danger
 *   info     → accent
 *
 * Hover-pause: the auto-dismiss timer keeps running in the background; if
 * the user is hovering, we just visually "freeze" so they have time to
 * tap the action button. Implementation note — we don't actually pause the
 * timer (would need a state-machine); instead the CTA stays interactive
 * until the toast is removed from the queue.
 */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:left-auto sm:items-end"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const { t } = useTranslation();
  const { variant, message, action } = toast;
  const Icon = variant === 'success' ? CheckCircle2 : variant === 'error' ? AlertCircle : Info;
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
        'animate-slide-up backdrop-blur-md',
        variant === 'success' && 'border-brand-200 bg-brand-50/95 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100',
        variant === 'error' && 'border-danger/40 bg-danger-soft/95 text-danger dark:bg-danger/15',
        variant === 'info' && 'border-accent-200 bg-accent-50/95 text-accent-700 dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-100',
      )}
    >
      <Icon className="mt-0.5 size-4 flex-shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm font-medium leading-snug">{message}</div>
      {action ? (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
          className="rounded-md px-2 py-0.5 text-sm font-semibold underline-offset-2 hover:underline"
        >
          {action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('common.dismiss')}
        className="-mr-1 -mt-1 rounded-md p-1 text-current opacity-70 hover:opacity-100"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
