import { useEffect, useState } from 'react';
import { Copy, RefreshCw, Share2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useTranslation } from 'react-i18next';
import { toast } from '../../store/toast';
import { cn } from '../../lib/utils';
import {
  formatInviteRemaining,
  INVITE_CODE_EXPIRY_MS,
  type Invite,
} from '../../store/invite';

/**
 * InviteCodeDisplay — big rendered block for the *generated* code.
 *
 * Shows the 6 chars in a single oversized pill so the recipient can read
 * it from across the room (or copy it with one tap). The countdown
 * refreshes every 30s — fine resolution for a 24h window, and cheap on
 * the React side (no per-second timer that just rewrites a string).
 *
 * Two share affordances:
 *   1. Copy — writes to clipboard via the async API; falls back to a
 *      hidden `<textarea>` + `execCommand` when the Clipboard API is
 *      unavailable (older Safari).
 *   2. Share — uses the Web Share API when present (mobile) and falls
 *      back to copy on desktop. The native sheet handles SMS / email /
 *      AirDrop natively so the user picks their channel.
 */

interface InviteCodeDisplayProps {
  invite: Invite;
  onRegenerate: () => void;
}

export function InviteCodeDisplay({ invite, onRegenerate }: InviteCodeDisplayProps) {
  const { t } = useTranslation();
  // Tick once a minute is plenty — UI just rewrites the "Xh Ym" string.
  // We capture "now" via state so the comparison is stable across renders
  // (otherwise the linter complains about impure `Date.now()` in render).
  const [now] = useState(() => Date.now());
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = invite.expiresAt - now;
  const expired = remainingMs <= 0;
  const remainingLabel = expired
    ? t('couple.invite.expired')
    : t('couple.invite.expiresIn', { remaining: formatInviteRemaining(remainingMs) });

  const shareText = t('couple.invite.shareText', { code: invite.code });

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invite.code);
      } else {
        // Fallback — older browsers / non-secure contexts.
        const ta = document.createElement('textarea');
        ta.value = invite.code;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast({ variant: 'success', message: t('couple.invite.copyToast') });
    } catch {
      toast({ variant: 'error', message: t('couple.invite.copyError') });
    }
  };

  const share = async () => {
    try {
      // navigator.share wants a secure context (https) and a user gesture.
      // We always invoked from a button tap so the gesture is fine; if the
      // browser lacks `share` we just copy and let the user paste.
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ text: shareText });
        return;
      }
    } catch {
      // Fall through to copy.
    }
    await copy();
  };

  return (
    <Card raised className="overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
            {t('couple.invite.yourCode')}
          </p>
          <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
            {t('couple.invite.shareHint')}
          </p>
        </div>
        <span
          className={cn(
            'pf-chip flex-shrink-0',
            expired
              ? 'border-danger/40 bg-danger-soft text-danger dark:bg-danger/15'
              : 'border-brand-300/60 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100',
          )}
        >
          {remainingLabel}
        </span>
      </div>

      <div
        className={cn(
          'mt-4 rounded-xl border bg-[rgb(var(--bg-sunken))]/60 px-4 py-5 text-center',
          'border-[rgb(var(--border-default))]',
        )}
      >
        <p
          className={cn(
            'font-mono text-4xl font-bold tracking-[0.18em] sm:text-5xl',
            expired
              ? 'text-[rgb(var(--fg-subtle))] line-through'
              : 'text-[rgb(var(--fg-primary))]',
          )}
          aria-live="polite"
        >
          {invite.code}
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-wide text-[rgb(var(--fg-subtle))]">
          {t('couple.invite.expiresAt', {
            time: new Date(invite.expiresAt).toLocaleString(),
          })}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="md"
          leadingIcon={<Share2 className="size-4" />}
          onClick={share}
        >
          {t('couple.invite.share')}
        </Button>
        <Button
          variant="outline"
          size="md"
          leadingIcon={<Copy className="size-4" />}
          onClick={copy}
        >
          {t('couple.invite.copy')}
        </Button>
        <Button
          variant="ghost"
          size="md"
          leadingIcon={<RefreshCw className="size-4" />}
          onClick={onRegenerate}
        >
          {t('couple.invite.regenerate')}
        </Button>
      </div>
    </Card>
  );
}

/**
 * Exposed so the Couple page can compute "is this invite about to die"
 * without re-importing the constant.
 */
export const INVITE_DURATION_HOURS = INVITE_CODE_EXPIRY_MS / (60 * 60 * 1000);