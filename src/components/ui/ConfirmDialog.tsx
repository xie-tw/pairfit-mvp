import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Card } from './Card';
import { cn } from '../../lib/utils';

/**
 * Reusable confirmation dialog — PF-9.
 *
 * Lives at the ui layer so any future flow (PF-4 delete meal, PF-6
 * unbind partner, etc.) can grab the same shape without re-styling a
 * backdrop each time. Behavior:
 *   - Backdrop click cancels (calls `onCancel`).
 *   - `Escape` cancels.
 *   - The cancel button receives initial focus so an accidental Enter
 *     doesn't dismiss an irreversible action.
 *
 * Children are rendered in the body so callers can drop extra copy or a
 * confirmation input field (e.g. the "type DELETE to confirm" gate on
 * the data-wipe flow) without growing this component.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Used as `aria-describedby`. Optional because some flows are title-only. */
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Visually emphasize the confirm button as destructive. */
  destructive?: boolean;
  /** Disable the confirm until `enabled` flips true (e.g. typing validation). */
  confirmEnabled?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  confirmEnabled = true,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = 'confirm-dialog-title';
  const descId = description ? 'confirm-dialog-desc' : undefined;

  // Reset focus to cancel whenever the dialog re-opens — guards against
  // the previous page's focus state surviving the backdrop.
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 pt-12 sm:items-center sm:p-6"
    >
      <button
        type="button"
        aria-label={cancelLabel ?? t('common.cancel')}
        onClick={onCancel}
        className="absolute inset-0 bg-[rgb(var(--bg-app))]/70 backdrop-blur-sm"
      />
      <Card raised className="relative w-full max-w-sm animate-slide-up">
        <h2
          id={titleId}
          className="text-base font-semibold text-[rgb(var(--fg-primary))]"
        >
          {title}
        </h2>
        {description ? (
          <p id={descId} className="mt-1.5 text-sm text-[rgb(var(--fg-secondary))]">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="ghost" size="md" onClick={onCancel}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            size="md"
            onClick={onConfirm}
            disabled={!confirmEnabled}
            loading={loading}
            className={cn(!destructive && 'pf-press')}
          >
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}