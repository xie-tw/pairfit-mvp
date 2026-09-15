import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Coins as CoinsIcon,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useCurrentUser, useAuthStore } from '../store/auth';
import { useCoinStore } from '../store/coins';
import { useNotificationCenter } from '../store/notificationCenter';
import { toast } from '../store/toast';
import { cn } from '../lib/utils';

/**
 * Notifications — PF-7.
 *
 * Two flavors live here:
 *
 *   - **Coin-confirm requests** — pending entries where the partner needs
 *     to act. Tapping confirm/decline directly mutates the coin ledger.
 *   - **Generic notifications** — coin results, info pings. Read-only.
 *
 * The page mounts `useDailyTaskSweep()` indirectly via the home route;
 * here we only read the notification list.
 */
export function NotificationsPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const list = useNotificationCenter((s) => (user ? s.list(user.id) : []));
  const markSeen = useNotificationCenter((s) => s.markSeen);
  const markAllSeen = useNotificationCenter((s) => s.markAllSeen);
  const pendingCoinRequestsFor = useNotificationCenter((s) => s.pendingCoinRequestsFor);
  const coinEntries = useCoinStore((s) => s.entries);
  const coinBalance = useCoinStore((s) => (user ? s.balanceOf(user.id) : 0));
  const confirmCoin = useCoinStore((s) => s.confirm);
  const declineCoin = useCoinStore((s) => s.decline);
  const removeForCoinEntry = useNotificationCenter((s) => s.removeForCoinEntry);
  const users = useAuthStore((s) => s.users);

  const coinRequests = useMemo(
    () => (user ? pendingCoinRequestsFor(user.id, coinEntries) : []),
    [user, pendingCoinRequestsFor, coinEntries],
  );
  const pushCoinResult = useNotificationCenter((s) => s.pushCoinResult);

  // Pending requests don't appear in the `list` reader (they live only
  // in `pendingCoinRequestsFor`), so merge them for display.
  const merged = useMemo(() => {
    if (!user) return [] as NotificationDisplay[];
    const coinRequestIds = new Set(coinRequests.map((r) => r.notification.id));
    const otherItems: NotificationDisplay[] = list
      .filter((n) => !coinRequestIds.has(n.id))
      .map((n) => ({ kind: 'item' as const, item: n }));
    const requestDisplays: NotificationDisplay[] = coinRequests.map((r) => ({
      kind: 'request' as const,
      notification: r.notification,
      entry: r.entry,
    }));
    return [...requestDisplays, ...otherItems].sort((a, b) => {
      const ta = a.kind === 'request' ? a.notification.createdAt : a.item.createdAt;
      const tb = b.kind === 'request' ? b.notification.createdAt : b.item.createdAt;
      return tb - ta;
    });
  }, [list, coinRequests, user]);

  // Capture wall-clock once per render so the auto-confirm timer copy
  // stays consistent while the user scrolls. Avoids the React Compiler
  // "Date.now is impure" warning. Same idiom as the Subscription page.
  const [now] = useState(() => Date.now());

  if (!user) {
    return (
      <div className="animate-fade-in">
        <PageHeader title={t('notifications.title')} subtitle={t('auth.signInRequired')} />
      </div>
    );
  }

  const onConfirmRequest = (entryId: string, notifId: string) => {
    const entry = coinEntries.find((e) => e.id === entryId);
    if (!entry) return;
    const updated = confirmCoin(entryId, user.id);
    if (!updated) return;
    removeForCoinEntry(entryId);
    markSeen(notifId);
    // Notify the entry owner that the partner acted on their request.
    pushCoinResult({
      userId: updated.userId,
      entryId: updated.id,
      outcome: 'confirmed',
      delta: updated.delta,
    });
    toast({
      variant: 'success',
      message: t('notifications.confirmed', { delta: formatDeltaLocal(updated.delta) }),
    });
  };

  const onDeclineRequest = (entryId: string, notifId: string) => {
    const entry = coinEntries.find((e) => e.id === entryId);
    if (!entry) return;
    const updated = declineCoin(entryId, user.id);
    if (!updated) return;
    removeForCoinEntry(entryId);
    markSeen(notifId);
    pushCoinResult({
      userId: updated.userId,
      entryId: updated.id,
      outcome: 'declined',
      delta: updated.delta,
    });
    toast({
      variant: 'info',
      message: t('notifications.declined'),
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        trailing={
          <button
            type="button"
            onClick={() => markAllSeen(user.id)}
            className="inline-flex h-8 items-center rounded-full border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] px-3 text-xs font-medium text-[rgb(var(--fg-secondary))] hover:text-[rgb(var(--fg-primary))]"
          >
            {t('notifications.markAllRead')}
          </button>
        }
      />

      {merged.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-[rgb(var(--fg-secondary))]">
            {t('notifications.empty')}
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {merged.map((entry) => {
            if (entry.kind === 'request') {
              const partnerName =
                users.find((u) => u.id === entry.entry.userId)?.displayName ?? 'Partner';
              return (
                <li key={entry.notification.id}>
                  <Card noPadding className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div
                        aria-hidden
                        className="mt-0.5 flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
                      >
                        <CoinsIcon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[rgb(var(--fg-primary))]">
                          {t('notifications.confirmPrompt', {
                            delta: formatDeltaLocal(entry.entry.delta),
                            partner: partnerName,
                          })}
                        </p>
                        <p className="mt-0.5 text-xs text-[rgb(var(--fg-secondary))]">
                          {new Date(entry.entry.createdAt).toLocaleString()}
                          {' · '}
                          {t('notifications.expiresIn', {
                            hours: Math.max(
                              0,
                              Math.round((entry.entry.expiresAt - now) / (60 * 60 * 1000)),
                            ),
                          })}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onConfirmRequest(entry.entry.id, entry.notification.id)}
                            leadingIcon={<Check className="size-3" aria-hidden />}
                          >
                            {t('notifications.confirm')}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onDeclineRequest(entry.entry.id, entry.notification.id)}
                            leadingIcon={<X className="size-3" aria-hidden />}
                          >
                            {t('notifications.decline')}
                          </Button>
                          <span className="ml-auto text-[11px] text-[rgb(var(--fg-subtle))]">
                            {t('notifications.balance', { balance: coinBalance.toLocaleString() })}
                          </span>
                        </div>
                      </div>
                      {!entry.notification.seen ? <UnreadDot /> : null}
                    </div>
                  </Card>
                </li>
              );
            }
            // Read-only notification row
            const item = entry.item;
            return (
              <li key={item.id}>
                <Card noPadding className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div
                      aria-hidden
                      className={cn(
                        'mt-0.5 flex size-9 flex-shrink-0 items-center justify-center rounded-full',
                        'bg-[rgb(var(--bg-sunken))] text-[rgb(var(--fg-secondary))]',
                      )}
                    >
                      <Sparkles className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <NotificationBody item={item} />
                      <p className="mt-0.5 text-xs text-[rgb(var(--fg-secondary))]">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!item.seen ? <UnreadDot /> : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-center text-xs text-[rgb(var(--fg-secondary))]">
        <Link to="/coins" className="hover:underline">
          {t('notifications.viewCoins')}
        </Link>
      </p>
    </div>
  );
}

function UnreadDot() {
  return (
    <span
      aria-label="unread"
      className="mt-1 inline-block size-2 flex-shrink-0 rounded-full bg-brand-500"
    />
  );
}

type NotificationDisplay =
  | { kind: 'request'; notification: { id: string; createdAt: number; seen: boolean }; entry: { id: string; delta: number; createdAt: number; expiresAt: number; userId: string } }
  | { kind: 'item'; item: { id: string; createdAt: number; seen: boolean; payload: import('../store/notificationCenter').NotificationKind } };

function NotificationBody({
  item,
}: {
  item: { payload: import('../store/notificationCenter').NotificationKind };
}) {
  const { t } = useTranslation();
  const payload = item.payload;
  if (payload.kind === 'coin-result') {
    const sign = payload.delta > 0 ? '+' : '';
    return (
      <p className="text-sm font-medium text-[rgb(var(--fg-primary))]">
        {t(`notifications.coinResult.${payload.outcome}`, { delta: `${sign}${payload.delta}` })}
      </p>
    );
  }
  if (payload.kind === 'info') {
    return (
      <div>
        <p className="text-sm font-medium text-[rgb(var(--fg-primary))]">
          {t(payload.titleKey)}
        </p>
        {payload.bodyKey ? (
          <p className="mt-0.5 text-xs text-[rgb(var(--fg-secondary))]">
            {t(payload.bodyKey, payload.bodyParams ?? {})}
          </p>
        ) : null}
      </div>
    );
  }
  return null;
}

function formatDeltaLocal(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
}
