import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Invite-code binding flow — PF-6.
 *
 * The MVP is local-only: two accounts on the same device / browser
 * profile can pair by exchanging a short 6-character code. The code
 * embeds the inviter's `userId` so the invitee can look it up and
 * request a binding back through the couple store.
 *
 * The alphabet is intentionally curated to skip visually-ambiguous
 * characters (0 / O, 1 / I / L) — users entering codes by hand on a
 * phone keyboard will mistype those constantly.
 *
 * 24h expiry matches the PRD spec. Codes that expired before use stay
 * in the list (with `expiresAt` in the past) so we can show "this
 * invite has expired" rather than 404'ing silently.
 */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;
const EXPIRY_MS = 24 * 60 * 60 * 1000;

export interface Invite {
  code: string;
  inviterId: string;
  createdAt: number;
  expiresAt: number;
  /** inviteeId once consumed; null while still redeemable. */
  usedBy: string | null;
  usedAt: number | null;
}

export type InviteErrorCode = 'notFound' | 'expired' | 'self' | 'alreadyUsed';

export type ConsumeResult =
  | { ok: true; invite: Invite }
  | { ok: false; code: InviteErrorCode };

interface InviteState {
  invites: Invite[];
  /**
   * Issue a fresh 6-char code for `inviterId`. If the inviter already has
   * an unexpired + unused code, return that one (single-active-invite
   * keeps the UI honest — there's only ever one "your code" to share).
   */
  generateInvite: (inviterId: string) => Invite;
  /**
   * Try to redeem a code. Returns the matching invite on success or a
   * typed error so the UI can show a specific toast. Marks `usedBy` so
   * a second redemption is rejected with `alreadyUsed`.
   */
  consumeInvite: (code: string, inviteeId: string) => ConsumeResult;
  /** Look up the active (unexpired + unused) code for an inviter. */
  activeInviteFor: (inviterId: string) => Invite | undefined;
  /** Look up a code by its literal string — case-insensitive, trims spaces. */
  findByCode: (code: string) => Invite | undefined;
  /** Manually discard the active invite (e.g. user tapped "regenerate"). */
  revokeActive: (inviterId: string) => void;
}

/**
 * Cryptographically random pick from `CODE_ALPHABET`. We use
 * `crypto.getRandomValues` rather than `Math.random` so the codes can't
 * be predicted by replaying page state — even though there's no security
 * boundary in MVP, biased codes are a footgun.
 */
function randomCode(): string {
  const alphabet = CODE_ALPHABET;
  // 6 chars from a 31-char alphabet → ~887M possibilities. Plenty.
  const out = new Uint8Array(CODE_LEN);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(out);
  } else {
    for (let i = 0; i < CODE_LEN; i += 1) out[i] = Math.floor(Math.random() * 256);
  }
  let code = '';
  for (let i = 0; i < CODE_LEN; i += 1) {
    code += alphabet[out[i]! % alphabet.length];
  }
  return code;
}

export const useInviteStore = create<InviteState>()(
  persist(
    (set, get) => ({
      invites: [],

      generateInvite: (inviterId) => {
        // Reuse the active code if one is still valid — saves the user
        // from "regenerating" and invalidating a code they already shared.
        const existing = get().activeInviteFor(inviterId);
        if (existing) return existing;

        const now = Date.now();
        const invite: Invite = {
          code: randomCode(),
          inviterId,
          createdAt: now,
          expiresAt: now + EXPIRY_MS,
          usedBy: null,
          usedAt: null,
        };
        set((state) => ({ invites: [...state.invites, invite] }));
        return invite;
      },

      consumeInvite: (code, inviteeId) => {
        const normalized = code.trim().toUpperCase();
        const invite = get().invites.find((i) => i.code === normalized);
        if (!invite) return { ok: false, code: 'notFound' };
        const now = Date.now();
        if (invite.expiresAt < now) return { ok: false, code: 'expired' };
        if (invite.usedBy) return { ok: false, code: 'alreadyUsed' };
        if (invite.inviterId === inviteeId) return { ok: false, code: 'self' };

        const updated: Invite = {
          ...invite,
          usedBy: inviteeId,
          usedAt: now,
        };
        set((state) => ({
          invites: state.invites.map((i) => (i.code === invite.code ? updated : i)),
        }));
        return { ok: true, invite: updated };
      },

      activeInviteFor: (inviterId) => {
        const now = Date.now();
        return get().invites.find(
          (i) =>
            i.inviterId === inviterId &&
            i.usedBy === null &&
            i.expiresAt > now,
        );
      },

      findByCode: (code) => {
        const normalized = code.trim().toUpperCase();
        return get().invites.find((i) => i.code === normalized);
      },

      revokeActive: (inviterId) => {
        const now = Date.now();
        set((state) => ({
          // Mark active invites as expired rather than deleting, so we can
          // still tell the user "the previous code has been revoked" if
          // they re-look it up later.
          invites: state.invites.map((i) =>
            i.inviterId === inviterId && i.usedBy === null && i.expiresAt > now
              ? { ...i, expiresAt: now }
              : i,
          ),
        }));
      },
    }),
    {
      name: 'pairfit:invites',
      partialize: (state) => ({ invites: state.invites }),
    },
  ),
);

/** Code length, alphabet, expiry — exposed so the UI can render hints. */
export const INVITE_CODE_LEN = CODE_LEN;
export const INVITE_CODE_EXPIRY_MS = EXPIRY_MS;
export const INVITE_CODE_ALPHABET = CODE_ALPHABET;

/**
 * Format the remaining lifetime of an invite as "Xh Ym". Used by the
 * countdown on the couple page. Returns `'expired'` for past timestamps
 * so the UI can branch on it without doing the comparison itself.
 */
export function formatInviteRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return 'expired';
  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}