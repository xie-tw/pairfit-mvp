import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Cheer / encouragement store — PF-6.
 *
 * A cheer is a one-way "you sent an emoji to your partner" event. Three
 * properties matter for MVP:
 *
 *   1. Daily rate-limit — PRD E-04 caps sends at 3 / sender / day to
 *      keep the gesture meaningful.
 *   2. `seen` flag — when the recipient opens the app we surface the
 *      unseen cheers as a toast / animation. Toggling `seen` is the
 *      only way to mark "I saw it" in a localStorage world.
 *   3. Web-Audio chirp on send — handled in the UI layer (`CheerButton`)
 *      because audio isn't a store concern.
 *
 * The cheer lives on its own persisted slot (`pairfit:cheers`) so that
 * wiping meal / weight logs doesn't also nuke the encouragement history.
 */

/** Maximum cheers a user can send to the same partner in a 24h window. */
export const MAX_DAILY_CHEERS = 3;

/** Curated set the UI exposes — keep in sync with `couple.cheerEmoji*`. */
export const CHEER_EMOJIS = ['💪', '🔥', '❤️', '👏', '🙌'] as const;
export type CheerEmoji = (typeof CHEER_EMOJIS)[number];

export interface Cheer {
  id: string;
  fromUserId: string;
  toUserId: string;
  emoji: CheerEmoji;
  createdAt: number;
  /** True once the recipient has surfaced the cheer (toast / animation). */
  seen: boolean;
}

export type SendCheerResult =
  | { ok: true; cheer: Cheer }
  | { ok: false; code: 'limitReached' | 'noRecipient' };

interface CheerState {
  cheers: Cheer[];
  /**
   * Record a cheer from `fromUserId` to `toUserId`. Returns the new record
   * or `{ ok: false, code: 'limitReached' }` when the sender is over the
   * 3-per-day cap. `code: 'noRecipient'` is a defensive guard for callers
   * that pass empty ids.
   */
  sendCheer: (input: {
    fromUserId: string;
    toUserId: string;
    emoji: CheerEmoji;
  }) => SendCheerResult;
  /** How many cheers `fromUserId` has sent to `toUserId` today (local TZ). */
  countToday: (fromUserId: string, toUserId: string) => number;
  /** Cheers addressed to `userId`; pass `onlyUnseen: true` for the inbox. */
  receivedCheers: (userId: string, onlyUnseen?: boolean) => Cheer[];
  /** Mark a single cheer as seen — called when the recipient renders it. */
  markSeen: (cheerId: string) => void;
  /** Mark every unseen cheer for `userId` as seen — bulk dismiss. */
  markAllSeen: (userId: string) => void;
}

/** Cheap local id — cheers don't need cryptographic uniqueness. */
function cheerId(): string {
  return `ch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Start of the local calendar day containing `at`. */
function startOfLocalDay(at: number): number {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const useCheerStore = create<CheerState>()(
  persist(
    (set, get) => ({
      cheers: [],

      sendCheer: ({ fromUserId, toUserId, emoji }) => {
        if (!fromUserId || !toUserId) return { ok: false, code: 'noRecipient' };
        const todayStart = startOfLocalDay(Date.now());
        const sentToday = get().cheers.filter(
          (c) =>
            c.fromUserId === fromUserId &&
            c.toUserId === toUserId &&
            c.createdAt >= todayStart,
        ).length;
        if (sentToday >= MAX_DAILY_CHEERS) return { ok: false, code: 'limitReached' };

        const cheer: Cheer = {
          id: cheerId(),
          fromUserId,
          toUserId,
          emoji,
          createdAt: Date.now(),
          seen: false,
        };
        set((state) => ({ cheers: [...state.cheers, cheer] }));
        return { ok: true, cheer };
      },

      countToday: (fromUserId, toUserId) => {
        const todayStart = startOfLocalDay(Date.now());
        return get().cheers.filter(
          (c) =>
            c.fromUserId === fromUserId &&
            c.toUserId === toUserId &&
            c.createdAt >= todayStart,
        ).length;
      },

      receivedCheers: (userId, onlyUnseen = false) => {
        return get()
          .cheers.filter((c) => c.toUserId === userId && (!onlyUnseen || !c.seen))
          .sort((a, b) => b.createdAt - a.createdAt);
      },

      markSeen: (cheerId) => {
        set((state) => ({
          cheers: state.cheers.map((c) =>
            c.id === cheerId ? { ...c, seen: true } : c,
          ),
        }));
      },

      markAllSeen: (userId) => {
        set((state) => ({
          cheers: state.cheers.map((c) =>
            c.toUserId === userId && !c.seen ? { ...c, seen: true } : c,
          ),
        }));
      },
    }),
    {
      name: 'pairfit:cheers',
      partialize: (state) => ({ cheers: state.cheers }),
    },
  ),
);

/* -------------------------------------------------------------------------- */
/* Read helpers — kept here so pages don't reinvent the same filters.        */
/* -------------------------------------------------------------------------- */

/** Most-recent unseen cheer for `userId`, or `null`. */
export function latestUnseenCheer(cheers: Cheer[], userId: string): Cheer | null {
  for (let i = cheers.length - 1; i >= 0; i -= 1) {
    const c = cheers[i]!;
    if (c.toUserId === userId && !c.seen) return c;
  }
  return null;
}