import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CoinEntry } from './coins';

/**
 * Notification center — PF-7.
 *
 * The "Me → Notifications" surface needs a lightweight inbox. We model
 * three shapes here:
 *
 *   coin-confirm  — partner proposed a Coin delta and needs to accept/reject.
 *                   Has a backing `coinEntryId` so the user can confirm or
 *                   decline without leaving the list.
 *   coin-result   — terminal result of a confirm/decline/expire (one-shot).
 *   info          — generic news (a goal was reached, a gift was unlocked, …).
 *
 * Coin-confirm notifications are *derived* from the coin ledger on every
 * read — they don't have their own row. The notification center just
 * exposes a `pendingCoinRequestsFor(userId)` reader that maps to the
 * `CoinEntry.status === 'pending' && relatedUserId === userId` set.
 *
 * Generic info items *do* persist — they're separate because they're
 * not paired with ledger state and they survive a coin entry being
 * cleared. Newest first, capped at 30 (PRD §14.4).
 *
 * `seen` flag — flipped on render so the red dot clears.
 */

export type NotificationKind =
  | { kind: 'coin-confirm'; coinEntryId: string }
  | { kind: 'coin-result'; entryId: string; outcome: 'confirmed' | 'declined' | 'expired'; delta: number }
  | { kind: 'info'; titleKey: string; bodyKey?: string; bodyParams?: Record<string, unknown> };

export interface NotificationItem {
  id: string;
  userId: string;
  createdAt: number;
  seen: boolean;
  payload: NotificationKind;
}

export const MAX_NOTIFICATIONS = 30;

interface NotificationCenterState {
  items: NotificationItem[];

  push: (item: Omit<NotificationItem, 'id' | 'createdAt' | 'seen'>) => void;
  markSeen: (id: string) => void;
  markAllSeen: (userId: string) => void;
  removeForCoinEntry: (entryId: string) => void;
  /** Wipe everything for the user — used by data-wipe / tests. */
  clearFor: (userId: string) => void;

  /** Convenience: synthesize a coin-result notification (called after confirm/decline/expire). */
  pushCoinResult: (input: {
    userId: string;
    entryId: string;
    outcome: 'confirmed' | 'declined' | 'expired';
    delta: number;
  }) => void;

  /** Cheap pure reader — does not subscribe. */
  list: (userId: string) => NotificationItem[];
  /** Count of unseen items, used by the TopBar dot. */
  unreadCount: (userId: string) => number;
  /** Pending coin-confirm requests, newest first. */
  pendingCoinRequestsFor: (userId: string, entries: CoinEntry[]) => Array<{
    notification: NotificationItem;
    entry: CoinEntry;
  }>;
}

export const NOTIFICATION_CENTER_KEY = 'pairfit:notificationCenter';

function notificationId(): string {
  return `nt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Trim the per-user list to `MAX_NOTIFICATIONS` newest items. The store
 * is shared by every user on the device, so we filter before trimming —
 * otherwise another user's flood would push out your own history.
 */
function trim(items: NotificationItem[], userId: string): NotificationItem[] {
  const mine = items.filter((item) => item.userId === userId);
  const others = items.filter((item) => item.userId !== userId);
  const sorted = mine.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_NOTIFICATIONS);
  return [...others, ...sorted];
}

export const useNotificationCenter = create<NotificationCenterState>()(
  persist(
    (set, get) => ({
      items: [],

      push: (item) => {
        const next: NotificationItem = {
          ...item,
          id: notificationId(),
          createdAt: Date.now(),
          seen: false,
        };
        set((state) => {
          const items = trim([...state.items, next], item.userId);
          return { items };
        });
      },

      markSeen: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, seen: true } : item,
          ),
        })),

      markAllSeen: (userId) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.userId === userId && !item.seen ? { ...item, seen: true } : item,
          ),
        })),

      removeForCoinEntry: (entryId) =>
        set((state) => ({
          items: state.items.filter(
            (item) =>
              !(
                (item.payload.kind === 'coin-confirm' &&
                  item.payload.coinEntryId === entryId) ||
                (item.payload.kind === 'coin-result' && item.payload.entryId === entryId)
              ),
          ),
        })),

      clearFor: (userId) =>
        set((state) => ({
          items: state.items.filter((item) => item.userId !== userId),
        })),

      pushCoinResult: (input) => {
        get().push({
          userId: input.userId,
          payload: {
            kind: 'coin-result',
            entryId: input.entryId,
            outcome: input.outcome,
            delta: input.delta,
          },
        });
      },

      list: (userId) =>
        get()
          .items.filter((item) => item.userId === userId)
          .sort((a, b) => b.createdAt - a.createdAt),

      unreadCount: (userId) =>
        get().items.filter((item) => item.userId === userId && !item.seen).length,

      pendingCoinRequestsFor: (userId, entries) => {
        const pendingEntries = entries.filter(
          (e) => e.status === 'pending' && e.relatedUserId === userId,
        );
        const pendingEntryIds = new Set(pendingEntries.map((e) => e.id));
        const items = get().items.filter((item) => {
          if (item.userId !== userId) return false;
          if (item.payload.kind !== 'coin-confirm') return false;
          // `coinEntryId` is structurally present after narrowing, but
          // TS doesn't carry that narrowing through a callback's outer
          // scope. Use the locally-typed variant via a separate var.
          const kind = item.payload;
          return kind.kind === 'coin-confirm' && pendingEntryIds.has(kind.coinEntryId);
        });
        // Sort by createdAt desc, then map to {notification, entry}.
        const sorted = items.sort((a, b) => b.createdAt - a.createdAt);
        return sorted
          .map((notification) => {
            const kind = notification.payload;
            if (kind.kind !== 'coin-confirm') return null;
            const entry = pendingEntries.find((e) => e.id === kind.coinEntryId);
            return entry ? { notification, entry } : null;
          })
          .filter((x): x is { notification: NotificationItem; entry: CoinEntry } => x !== null);
      },
    }),
    {
      name: NOTIFICATION_CENTER_KEY,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
