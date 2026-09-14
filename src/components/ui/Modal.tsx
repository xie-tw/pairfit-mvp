import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

/**
 * Modal — a lightweight bottom-sheet-style dialog.
 *
 * Behaviour:
 *   - Renders into a portal at the document root so it can overflow the
 *     app shell's stacking context.
 *   - Closes on backdrop click, Escape, or close-button.
 *   - Locks body scroll while open.
 *
 * Used by the food-record item editor (PF-4) and reserved for future
 * flows that need a transient form.
 */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Optional footer slot — typically a primary action button. */
  footer?: ReactNode;
  /** Max width of the sheet. */
  widthClass?: string;
}

export function Modal({ open, onClose, title, children, footer, widthClass }: ModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-elevated))] shadow-lg sm:rounded-2xl',
          widthClass ?? 'sm:max-w-md',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[rgb(var(--border-default))] bg-[rgb(var(--bg-elevated))] px-4 py-3">
          <h2 className="text-base font-semibold text-[rgb(var(--fg-primary))]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.dismiss')}
            className="pf-press inline-flex size-8 items-center justify-center rounded-full text-[rgb(var(--fg-secondary))] hover:bg-[rgb(var(--bg-sunken))]"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer ? (
          <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-[rgb(var(--border-default))] bg-[rgb(var(--bg-elevated))] px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
