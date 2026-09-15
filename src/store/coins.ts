import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Virtual coin ledger — PF-7.
 *
 * Coins are a *local-only* virtual currency that drives reward/penalty
 * feedback and powers the cosmetic shop. Compliance notes (see PRD §14):
 *   1. Coins cannot be recharged with real money.
 *   2. Coins cannot be redeemed for cash.
 *   3. Coins cannot be transferred between users (MVP).
 * Therefore the only way `balance` changes is:
 *   - Daily task complete → +10 (lose) / +10 (gain)
 *   - Daily task missed → -5 (lose) / -5 (gain)
 *   - Gift redeem → -price
 *
 * Dual-confirmation flow
 * ----------------------
 * PairFit's PRD requires that *both* users approve any balance change
 * (this prevents unilateral cheating — A can't just mark B's task done).
 * The state machine lives here:
 *
 *   pending   — created by the system; neither user has acted.
 *   confirmed — partner accepted; `delta` applied to `balance`.
 *   declined  — partner rejected; nothing changes.
 *   expired   — 24h elapsed without action; treated as `confirmed`.
 *
 * Once an entry reaches `confirmed` / `declined` / `expired` it's
 * terminal — `applyEntry()` is a no-op on those.
 */

export type CoinReason =
  | 'task_complete'
  | 'task_fail'
  | 'gift_redeem'
  | 'gift_received';

export type CoinEntryStatus = 'pending' | 'confirmed' | 'declined' | 'expired';

export interface CoinEntry {
  id: string;
  /** The user whose balance is affected. */
  userId: string;
  /** Signed delta: +10, -5, -price, etc. */
  delta: number;
  reason: CoinReason;
  /** Optional human-readable label (e.g. "Today's plan complete"). */
  label?: string;
  /** For task entries, the date (yyyy-mm-dd local) the system evaluated. */
  taskDate?: string;
  /** Partner required to confirm. `null` for self-only actions (gift redeem). */
  relatedUserId: string | null;
  createdAt: number;
  /** Time at which the auto-confirm timer will fire. 0 = no auto-confirm. */
  expiresAt: number;
  confirmedBy: string | null;
  confirmedAt: number | null;
  status: CoinEntryStatus;
}

export const MAX_BALANCE = 1000;
const AUTO_CONFIRM_MS = 24 * 60 * 60 * 1000;

interface CoinState {
  entries: CoinEntry[];

  /**
   * Append a pending entry that needs partner confirmation. The system
   * kicks this off when it detects today's task status. Caller passes a
   * `relatedUserId` (partner); we schedule auto-confirm at +24h.
   */
  propose: (input: {
    userId: string;
    delta: number;
    reason: CoinReason;
    label?: string;
    taskDate?: string;
    relatedUserId: string | null;
  }) => CoinEntry;

  /** Apply a pending entry — used both for partner confirm and the 24h timer. */
  confirm: (entryId: string, byUserId: string) => CoinEntry | null;
  /** Partner rejects the proposed delta. Entry becomes terminal `declined`. */
  decline: (entryId: string, byUserId: string) => CoinEntry | null;
  /**
   * Gift redeem bypasses confirmation (it's the user's own money + the
   * only user-side action that costs coins). We append a `confirmed`
   * entry directly so it shows up in the history.
   */
  redeemGift: (input: {
    userId: string;
    price: number;
    giftId: string;
    label: string;
  }) => CoinEntry | null;
  /**
   * Sweep entries that have crossed `expiresAt` without action. The app
   * calls this on mount (and periodically) to flip them to `confirmed`
   * and apply the delta. Returns the entries that flipped so callers
   * can toast a confirmation if they want.
   */
  sweepExpired: (now?: number) => CoinEntry[];

  /* --------------------------- read helpers ---------------------------- */
  /** Live balance — sum of every confirmed entry's delta, clamped to [0, 1000]. */
  balanceOf: (userId: string, now?: number) => number;
  /** All entries for a user, newest first. */
  historyOf: (userId: string) => CoinEntry[];
  /** Entries where the user is the partner and needs to act. */
  pendingForPartner: (userId: string) => CoinEntry[];
  /** Has today's task already been evaluated? Used by the daily scheduler. */
  todaysEntryFor: (userId: string, taskDate: string) => CoinEntry | undefined;
}

export const COIN_KEY = 'pairfit:coins';

function entryId(): string {
  return `cn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Clamp a candidate balance to the [0, MAX_BALANCE] window. Negative
 * balances mean the user has been penalized more than rewarded — we
 * floor at 0 so the UI never shows "-3 Coins". Positive overflows
 * (rewards past 1000) are clipped at the cap per the PRD.
 */
export function clampBalance(value: number): number {
  if (value < 0) return 0;
  if (value > MAX_BALANCE) return MAX_BALANCE;
  return Math.round(value);
}

export const useCoinStore = create<CoinState>()(
  persist(
    (set, get) => ({
      entries: [],

      propose: (input) => {
        const entry: CoinEntry = {
          id: entryId(),
          userId: input.userId,
          delta: input.delta,
          reason: input.reason,
          label: input.label,
          taskDate: input.taskDate,
          relatedUserId: input.relatedUserId,
          createdAt: Date.now(),
          expiresAt: Date.now() + AUTO_CONFIRM_MS,
          confirmedBy: null,
          confirmedAt: null,
          status: 'pending',
        };
        set((state) => ({ entries: [...state.entries, entry] }));
        return entry;
      },

      confirm: (entryId, byUserId) => {
        const entry = get().entries.find((e) => e.id === entryId);
        if (!entry || entry.status !== 'pending') return null;
        // Guard: the partner confirming must not be the entry's owner.
        if (byUserId === entry.userId) return null;
        const updated: CoinEntry = {
          ...entry,
          status: 'confirmed',
          confirmedBy: byUserId,
          confirmedAt: Date.now(),
        };
        set((state) => ({
          entries: state.entries.map((e) => (e.id === entryId ? updated : e)),
        }));
        return updated;
      },

      decline: (entryId, byUserId) => {
        const entry = get().entries.find((e) => e.id === entryId);
        if (!entry || entry.status !== 'pending') return null;
        if (byUserId === entry.userId) return null;
        const updated: CoinEntry = {
          ...entry,
          status: 'declined',
          confirmedBy: byUserId,
          confirmedAt: Date.now(),
        };
        set((state) => ({
          entries: state.entries.map((e) => (e.id === entryId ? updated : e)),
        }));
        return updated;
      },

      redeemGift: (input) => {
        const balance = get().balanceOf(input.userId);
        if (input.price > balance) return null;
        if (input.price <= 0) return null;
        const entry: CoinEntry = {
          id: entryId(),
          userId: input.userId,
          delta: -input.price,
          reason: 'gift_redeem',
          label: input.label,
          relatedUserId: null,
          createdAt: Date.now(),
          expiresAt: 0,
          confirmedBy: input.userId,
          confirmedAt: Date.now(),
          status: 'confirmed',
        };
        set((state) => ({ entries: [...state.entries, entry] }));
        return entry;
      },

      sweepExpired: (now = Date.now()) => {
        const flipped: CoinEntry[] = [];
        set((state) => {
          const next = state.entries.map((e) => {
            if (e.status !== 'pending' || e.expiresAt === 0 || e.expiresAt > now) return e;
            const updated: CoinEntry = {
              ...e,
              status: 'expired',
              confirmedAt: now,
            };
            flipped.push(updated);
            return updated;
          });
          return { entries: next };
        });
        return flipped;
      },

      /* --------------------------- read helpers ---------------------------- */
      balanceOf: (userId) => {
        const confirmed = get().entries.filter(
          (e) => e.userId === userId && (e.status === 'confirmed' || e.status === 'expired'),
        );
        // Pending entries also count *as if* they'll be confirmed so the
        // user sees the projected balance include today's task. The
        // actual apply happens on confirm/expire; this is purely a UI
        // affordance and is recomputed cheaply on every render.
        const pending = get().entries.filter(
          (e) => e.userId === userId && e.status === 'pending',
        );
        const raw = [...confirmed, ...pending].reduce((sum, e) => sum + e.delta, 0);
        return clampBalance(raw);
      },

      historyOf: (userId) => {
        return get()
          .entries.filter((e) => e.userId === userId)
          .sort((a, b) => b.createdAt - a.createdAt);
      },

      pendingForPartner: (userId) => {
        return get()
          .entries.filter((e) => e.status === 'pending' && e.relatedUserId === userId)
          .sort((a, b) => b.createdAt - a.createdAt);
      },

      todaysEntryFor: (userId, taskDate) =>
        get().entries.find((e) => e.userId === userId && e.taskDate === taskDate),
    }),
    {
      name: COIN_KEY,
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);

/**
 * Format a Coin delta for display. Positive → "+10", negative → "-5",
 * zero → "0". Single source so the history list doesn't have to re-derive
 * the sign for each row.
 */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
}

/**
 * Map a `CoinReason` to a localized key the UI can `t()` against. Kept
 * here so the translation bundle owns all copy and the store stays
 * representation-agnostic.
 */
export function reasonToI18nKey(reason: CoinReason): string {
  switch (reason) {
    case 'task_complete':
      return 'coins.reason.taskComplete';
    case 'task_fail':
      return 'coins.reason.taskFail';
    case 'gift_redeem':
      return 'coins.reason.giftRedeem';
    case 'gift_received':
      return 'coins.reason.giftReceived';
  }
}
