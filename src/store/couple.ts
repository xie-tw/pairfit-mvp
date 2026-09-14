import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Couple / partner-binding state — PF-9.
 *
 * PairFit's "one paid = two unlocked" promise is implemented as two halves:
 *   - `UserRecord.partnerId` (and the matching reciprocal pointer) live on
 *     the auth store, because partner attribution is intrinsic to the
 *     account shape.
 *   - This store owns the *binding workflow* — invite codes, pending
 *     requests, and the 7-day cooldown that prevents users from
 *     rapidly swapping partners to abuse the free Pro window.
 *
 * The split lets the auth store stay focused on identity while binding
 * transitions (request → accept / decline / cancel) live next to UI
 * concerns.
 */

export type CoupleStatus = 'pending' | 'active' | 'unbinding';

export interface CoupleBinding {
  id: string;
  /** User who sent the invite. */
  inviterId: string;
  /** User who accepted (or the same pair once accepted). */
  inviteeId: string;
  status: CoupleStatus;
  createdAt: number;
  /**
   * Set when one side initiates an unbind. Real severance is delayed by
   * `COOLDOWN_MS` so users can't bind → unlock Pro → unbind → bind a
   * different partner → unlock Pro again in the same session.
   */
  unbindRequestedAt?: number;
  unbindRequestedBy?: string;
  /**
   * Timestamp the binding is fully severed. The `setPartner(null)` step
   * on the auth store only fires once this is in the past.
   */
  unboundAt?: number;
}

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CoupleState {
  bindings: CoupleBinding[];
  /** Send an invite from one user to another. */
  requestBind: (inviterId: string, inviteeId: string) => CoupleBinding;
  /** Accept a pending invite → flips status to `active` and links both users. */
  acceptBind: (bindingId: string, accept: (a: string, b: string) => void) => void;
  /** Reject a pending invite before acceptance. */
  declineBind: (bindingId: string) => void;
  /**
   * Start the unbind cooldown. Returns the resulting binding (with status
   * `unbinding` + timestamps) or `null` if not found.
   */
  startUnbind: (
    bindingId: string,
    requesterId: string,
    onComplete: (bindingId: string) => void,
  ) => CoupleBinding | null;
  /** Look up the binding between two specific users (active only). */
  findBinding: (userAId: string, userBId: string) => CoupleBinding | undefined;
  /** Active binding for a given user (whatever side they're on). */
  activeBindingFor: (userId: string) => CoupleBinding | undefined;
  /** Pending invite for `userId` waiting on their accept/reject. */
  pendingInviteFor: (userId: string) => CoupleBinding | undefined;
}

export const COUPLE_KEY = 'pairfit:couple';

/**
 * Generate a short id for the binding. The auth store has a UUID helper
 * (`uuid()`) but couple bindings are not security-sensitive — a small
 * opaque id keeps the JSON shape readable for debugging.
 */
function bindingId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useCoupleStore = create<CoupleState>()(
  persist(
    (set, get) => ({
      bindings: [],

      requestBind: (inviterId, inviteeId) => {
        // No self-bind. Return a no-op pending record so the UI can show a
        // sane error without needing a different return shape.
        const binding: CoupleBinding = {
          id: bindingId(),
          inviterId,
          inviteeId,
          status: 'pending',
          createdAt: Date.now(),
        };
        set((state) => ({ bindings: [...state.bindings, binding] }));
        return binding;
      },

      acceptBind: (bindingId, accept) => {
        const binding = get().bindings.find((b) => b.id === bindingId);
        if (!binding || binding.status !== 'pending') return;
        accept(binding.inviterId, binding.inviteeId);
        set((state) => ({
          bindings: state.bindings.map((b) =>
            b.id === bindingId ? { ...b, status: 'active' as CoupleStatus } : b,
          ),
        }));
      },

      declineBind: (bindingId) => {
        set((state) => ({
          bindings: state.bindings.filter((b) => b.id !== bindingId),
        }));
      },

      startUnbind: (bindingId, requesterId, onComplete) => {
        const binding = get().bindings.find((b) => b.id === bindingId);
        if (!binding || binding.status === 'unbinding') return null;
        const next: CoupleBinding = {
          ...binding,
          status: 'unbinding',
          unbindRequestedAt: Date.now(),
          unbindRequestedBy: requesterId,
          unboundAt: Date.now() + COOLDOWN_MS,
        };
        set((state) => ({
          bindings: state.bindings.map((b) => (b.id === bindingId ? next : b)),
        }));
        // Schedule the real severance so we don't need a long-lived
        // scheduler outside the store. A hard refresh means the user
        // reloads with the binding still half-alive — that's fine, the
        // status flag makes it visibly "unbinding" everywhere.
        setTimeout(() => onComplete(bindingId), COOLDOWN_MS);
        return next;
      },

      findBinding: (a, b) =>
        get().bindings.find(
          (binding) =>
            (binding.inviterId === a && binding.inviteeId === b) ||
            (binding.inviterId === b && binding.inviteeId === a),
        ),

      activeBindingFor: (userId) =>
        get().bindings.find(
          (b) =>
            (b.inviterId === userId || b.inviteeId === userId) &&
            b.status === 'active',
        ),

      pendingInviteFor: (userId) =>
        get().bindings.find(
          (b) =>
            b.status === 'pending' &&
            (b.inviteeId === userId || b.inviterId === userId),
        ),
    }),
    {
      name: COUPLE_KEY,
      partialize: (state) => ({ bindings: state.bindings }),
    },
  ),
);

/**
 * Constant — exposed so UI can show "7 days remaining" copy without
 * re-declaring the cooldown duration in JSX.
 */
export const UNBIND_COOLDOWN_MS = COOLDOWN_MS;

/**
 * Format milliseconds-remaining as "Xd Yh" for the unbinding countdown.
 * Used by the couple subscription banner.
 */
export function formatCooldownRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return '0d 0h';
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return `${days}d ${hours}h`;
}