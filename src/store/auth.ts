import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { deobfuscate, obfuscate } from '../lib/storage';
import { constantTimeEqual, generateSalt, hashPassword, uuid } from '../lib/crypto';

/**
 * Auth store — the source of truth for "who is signed in".
 *
 * Layout:
 *   - `pairfit:users` → obfuscated list of every account ever created on
 *     this device. Lives behind XOR + base64 (see `lib/storage.ts`) so a
 *     casual peek at DevTools doesn't immediately expose email + name.
 *   - `pairfit:auth` → the *current* user id (plain text — it's just an id).
 *
 * We use zustand's `persist` middleware with a custom `storage` adapter so
 * the obfuscation wrapper is the only thing that touches localStorage for
 * the user list. The auth pointer is small enough that obfuscation buys us
 * nothing, so it stays in the clear.
 *
 * "Log in on this device" is intentionally simple — there's no concept of
 * multiple devices or sync. Once cloud lands in V1.1 this whole file gets
 * a sibling `useAccountRemote` that talks to the backend; the local store
 * becomes a cache.
 */

export type Unit = 'kg' | 'lb';
export type LocalePref = 'en' | 'zh';
export type ProPlan = 'monthly' | 'yearly';

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  /** SHA-256(salt + password), base64-encoded. Never store the plaintext. */
  passwordHash: string;
  /** Per-user salt, base64-encoded. Required to recompute the hash. */
  passwordSalt: string;
  unit: Unit;
  locale: LocalePref;
  avatar: string;
  createdAt: number;
  // ---- PF-9: Pro + couple subscription ---------------------------------
  /** True when the user (or their partner) has an active Pro plan. */
  isPro: boolean;
  /** Which plan the user is on; null on free. */
  proPlan: ProPlan | null;
  /** Timestamp the Pro benefits activated on this account. */
  proSince: number | null;
  /**
   * If Pro was unlocked via a partner's subscription, the partner's user id.
   * Cleared on unbind so we know to recompute `isPro` from self only.
   */
  proViaPartner: string | null;
  /** Optional couple binding — `null` when single. */
  partnerId: string | null;
}

/** What `register` / `login` actually return on the happy path. */
export type AuthResult =
  | { ok: true; user: UserRecord }
  | { ok: false; code: AuthErrorCode };

export type AuthErrorCode =
  | 'emailTaken'
  | 'invalidCredentials'
  | 'validation';

interface AuthState {
  users: UserRecord[];
  currentUserId: string | null;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<AuthResult>;
  login: (input: { email: string; password: string }) => Promise<AuthResult>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean }>;
  updateProfile: (patch: Partial<Pick<UserRecord, 'displayName' | 'unit' | 'locale' | 'avatar'>>) => void;
  /** Find an existing account by lowercased email — used for duplicate checks. */
  findByEmail: (email: string) => UserRecord | undefined;
  currentUser: () => UserRecord | null;
  // ---- PF-9: Pro subscription ----------------------------------------
  /** Activate Pro on the current user; partner gets auto-unlocked. */
  activatePro: (plan: ProPlan) => ProActivationResult;
  /** Cancel Pro on the current user; their partner (if unlocked via them) also drops. */
  cancelPro: () => void;
  /** Couple-binding helper: patch `partnerId` on a user record directly. */
  setPartner: (userId: string, partnerId: string | null) => void;
}

export type ProActivationResult =
  | { ok: true; partnerUnlocked: boolean; partnerId: string | null }
  | { ok: false; code: 'noCurrentUser' };

const USERS_KEY = 'pairfit:users';
const AUTH_KEY = 'pairfit:auth';

/**
 * zustand `persist` storage adapter that obfuscates the user list. The
 * `partialize` step on the store itself controls what gets serialized;
 * this adapter controls *how* — we only obfuscate the user list, and the
 * auth-pointer slot (`pairfit:auth`) passes through unchanged.
 *
 * `PersistStorage<S>` is generic over the *persisted* shape, not the
 * whole store. We cast on the way out since zustand treats the value as
 * opaque JSON.
 */
const obfuscatedStorage: PersistStorage<{ users: UserRecord[] }> = {
  getItem: (name: string): StorageValue<{ users: UserRecord[] }> | null => {
    const raw = localStorage.getItem(name);
    if (raw === null) return null;
    if (name !== USERS_KEY) return JSON.parse(raw) as StorageValue<{ users: UserRecord[] }>;
    // Round-trip the JSON string so zustand sees the same shape it wrote:
    // deobfuscate → re-stringify → return. Legacy cleartext blobs (JSON
    // without the XOR pass) parse fine and survive untouched.
    const decoded = deobfuscate<StorageValue<{ users: UserRecord[] }>>(raw);
    if (decoded) return decoded;
    try {
      // Pre-obfuscation entries were just `JSON.stringify({ state, version })`.
      return JSON.parse(raw) as StorageValue<{ users: UserRecord[] }>;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<{ users: UserRecord[] }>): void => {
    if (name !== USERS_KEY) {
      localStorage.setItem(name, JSON.stringify(value));
      return;
    }
    try {
      const encoded = obfuscate(value);
      if (encoded !== null) localStorage.setItem(name, encoded);
    } catch {
      // Malformed payload — drop it. The rehydrate step will seed an empty
      // list on the next load instead of locking the user out.
      localStorage.removeItem(name);
    }
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], { users: UserRecord[] }>(
    (set, get) => ({
      users: [],
      currentUserId: null,

      register: async ({ email, password, displayName }) => {
        const norm = normalizeEmail(email);
        if (get().findByEmail(norm)) {
          return { ok: false, code: 'emailTaken' };
        }
        const salt = generateSalt();
        const passwordHash = await hashPassword(password, salt);
        const user: UserRecord = {
          id: uuid(),
          email: norm,
          displayName: displayName.trim(),
          passwordHash,
          passwordSalt: salt,
          unit: 'kg',
          locale: 'en',
          avatar: '',
          createdAt: Date.now(),
          isPro: false,
          proPlan: null,
          proSince: null,
          proViaPartner: null,
          partnerId: null,
        };
        set((state) => ({ users: [...state.users, user], currentUserId: user.id }));
        // Mirror to the persisted pointer so the session survives reload.
        signIn(user.id);
        return { ok: true, user };
      },

      login: async ({ email, password }) => {
        const norm = normalizeEmail(email);
        const user = get().findByEmail(norm);
        if (!user) return { ok: false, code: 'invalidCredentials' };
        const candidate = await hashPassword(password, user.passwordSalt);
        if (!constantTimeEqual(candidate, user.passwordHash)) {
          return { ok: false, code: 'invalidCredentials' };
        }
        set({ currentUserId: user.id });
        signIn(user.id);
        return { ok: true, user };
      },

      logout: () => {
        set({ currentUserId: null });
        signOut();
      },

      // MVP compromise: we never send mail. The promise resolves with `ok: true`
      // for any syntactically-valid email so the UI can show the "reset link
      // sent" success state. Real delivery ships with the V1.1 backend.
      requestPasswordReset: async (email) => {
        const norm = normalizeEmail(email);
        await new Promise((r) => setTimeout(r, 250)); // simulate network
        return { ok: norm.length > 0 };
      },

      updateProfile: (patch) => {
        const { currentUserId, users } = get();
        if (!currentUserId) return;
        const next = users.map((u) =>
          u.id === currentUserId
            ? {
                ...u,
                ...patch,
                displayName: patch.displayName ? patch.displayName.trim() : u.displayName,
              }
            : u,
        );
        set({ users: next });
      },

      findByEmail: (email) => {
        const norm = normalizeEmail(email);
        return get().users.find((u) => u.email === norm);
      },

      /**
       * Activate Pro on the current user. If they're bound to a partner, the
       * partner is auto-unlocked (with `proViaPartner` pointing back here).
       *
       * Re-activation: clears any previous `proViaPartner` on the partner so
       * the "unlocked by X" attribution is always fresh — protects against
       * the partner having multiple prior unlocks stacking up.
       */
      activatePro: (plan) => {
        const { currentUserId, users } = get();
        if (!currentUserId) return { ok: false, code: 'noCurrentUser' };
        const now = Date.now();
        let partnerUnlocked = false;
        const next = users.map((u) => {
          if (u.id === currentUserId) {
            return {
              ...u,
              isPro: true,
              proPlan: plan,
              proSince: now,
              proViaPartner: null,
            };
          }
          if (u.partnerId === currentUserId) {
            partnerUnlocked = true;
            return {
              ...u,
              isPro: true,
              proPlan: null,
              proSince: now,
              proViaPartner: currentUserId,
            };
          }
          return u;
        });
        set({ users: next });
        const self = next.find((u) => u.id === currentUserId);
        return {
          ok: true,
          partnerUnlocked,
          partnerId: self?.partnerId ?? null,
        };
      },

      /**
       * Cancel Pro. The current user's plan drops immediately; if their
       * partner was riding on this subscription (`proViaPartner === self.id`)
       * the partner also falls back to free. Other partners who paid for
       * their own Pro are unaffected.
       */
      cancelPro: () => {
        const { currentUserId, users } = get();
        if (!currentUserId) return;
        const next = users.map((u) => {
          if (u.id === currentUserId) {
            return {
              ...u,
              isPro: false,
              proPlan: null,
              proSince: null,
              proViaPartner: null,
            };
          }
          if (u.proViaPartner === currentUserId) {
            return {
              ...u,
              isPro: false,
              proPlan: null,
              proSince: null,
              proViaPartner: null,
            };
          }
          return u;
        });
        set({ users: next });
      },

      /**
       * Couple-binding helper — set or clear `partnerId` on a user record.
       * Also clears `proViaPartner` on unbind so the partner's `isPro`
       * fallback doesn't get stuck pointing at a now-unbound id.
       */
      setPartner: (userId, partnerId) => {
        const next = get().users.map((u) => {
          if (u.id !== userId) return u;
          return {
            ...u,
            partnerId,
            // If we just unbound, drop any subscription attribution too.
            ...(partnerId === null ? { proViaPartner: null } : null),
          };
        });
        set({ users: next });
      },

      currentUser: () => {
        const { currentUserId, users } = get();
        if (!currentUserId) return null;
        return users.find((u) => u.id === currentUserId) ?? null;
      },
    }),
    {
      name: USERS_KEY,
      storage: obfuscatedStorage,
      // Only the user list is persisted through the obfuscated adapter; the
      // current-user pointer lives in its own slot (see below).
      partialize: (state) => ({ users: state.users }),
    },
  ),
);

/**
 * A second `persist` instance dedicated to `currentUserId`. We split it out
 * so that signing in/out doesn't force a re-encode of the (potentially huge)
 * user list, and so the obfuscation wrapper never touches the pointer.
 */
interface AuthPointerState {
  currentUserId: string | null;
  setCurrentUserId: (id: string | null) => void;
}

export const useAuthPointer = create<AuthPointerState>()(
  persist(
    (set) => ({
      currentUserId: null,
      setCurrentUserId: (id) => set({ currentUserId: id }),
    }),
    { name: AUTH_KEY, partialize: (s) => ({ currentUserId: s.currentUserId }) },
  ),
);

/**
 * Sync helpers — the two stores are intentionally split, so callers that
 * care about both can `signIn`/`signOut` atomically without each page
 * having to remember the pairing. The auth store's own `logout` method
 * performs the same work internally; this wrapper exists so non-store
 * callers (e.g. a `<button>` onClick) don't need to touch both stores.
 */
export function signOut(): void {
  useAuthStore.setState({ currentUserId: null });
  useAuthPointer.getState().setCurrentUserId(null);
}

export function signIn(userId: string): void {
  useAuthStore.setState({ currentUserId: userId });
  useAuthPointer.getState().setCurrentUserId(userId);
}

/**
 * `useCurrentUser` is a tiny convenience hook that combines both stores.
 * Components can `const user = useCurrentUser()` and get the live user
 * record (or `null` when signed out), with auto re-render on either side.
 */
export function useCurrentUser(): UserRecord | null {
  const users = useAuthStore((s) => s.users);
  const currentUserId = useAuthPointer((s) => s.currentUserId);
  return useMemo(() => {
    if (!currentUserId) return null;
    return users.find((u) => u.id === currentUserId) ?? null;
  }, [users, currentUserId]);
}

/**
 * Migration helper — if an earlier build stored users in cleartext under
 * `pairfit:users` (unlikely, but cheap to defend against), `deobfuscate`
 * returns null and the store just starts empty. We expose a one-off reader
 * here for callers that want to attempt recovery from a known-cleartext
 * blob during onboarding. Not used in the normal flow.
 */
export function peekLegacyUsers(): unknown[] | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return null;
  const decoded = deobfuscate<{ state?: { users?: unknown[] } }>(raw);
  if (decoded?.state?.users) return decoded.state.users;
  // Pre-obfuscation entries were just `JSON.stringify({ state, version })`.
  try {
    const parsed = JSON.parse(raw) as { state?: { users?: unknown[] } };
    return parsed.state?.users ?? null;
  } catch {
    return null;
  }
}