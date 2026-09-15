import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Cosmetic unlocks — PF-7.
 *
 * Coins can be spent on virtual items: avatar frames, theme backgrounds,
 * and titles. This store owns the *unlock* ledger (what each user has
 * redeemed) and the *equipped* choices (which item is currently active).
 *
 * The shop page (PF-7 deliverable) reads `unlocksFor(userId)` to render
 * the buy / equip buttons. The Home / Profile / Me surfaces read
 * `useCosmeticsFor(userId)` to style themselves.
 *
 * Catalog lives in `lib/cosmetics.ts` because it's a static catalog the
 * build pipeline tree-shakes. The store just records what each user owns.
 */

export type FrameId = 'default' | 'gold' | 'rainbow' | 'flame' | 'ocean';
export type ThemeBgId = 'default' | 'sunset' | 'ocean' | 'aurora' | 'forest';
export type TitleId = 'newbie' | 'fit_master' | 'weight_loss_hero' | 'weight_gain_champ';

export interface UnlockedCosmetics {
  frames: FrameId[];
  themes: ThemeBgId[];
  titles: TitleId[];
}

export interface EquippedCosmetics {
  frame: FrameId;
  theme: ThemeBgId;
  title: TitleId;
}

export interface CosmeticsState {
  /** Per-user unlock ledger — `unlocks[userId]` is the items they own. */
  unlocks: Record<string, UnlockedCosmetics>;
  /** Per-user equipped selections. */
  equipped: Record<string, EquippedCosmetics>;

  unlock: (userId: string, kind: CosmeticKind, id: string) => void;
  equip: (userId: string, kind: CosmeticKind, id: string) => void;
  /** Drop everything for a single user. Used by data-wipe / tests. */
  resetUser: (userId: string) => void;
}

export type CosmeticKind = 'frame' | 'theme' | 'title';

export const COSMETICS_KEY = 'pairfit:cosmetics';

const DEFAULT_UNLOCKS: UnlockedCosmetics = {
  frames: ['default'],
  themes: ['default'],
  titles: ['newbie'],
};

const DEFAULT_EQUIPPED: EquippedCosmetics = {
  frame: 'default',
  theme: 'default',
  title: 'newbie',
};

function ensureUser(unlocks: Record<string, UnlockedCosmetics>, userId: string): UnlockedCosmetics {
  return unlocks[userId] ?? { ...DEFAULT_UNLOCKS, frames: [...DEFAULT_UNLOCKS.frames], themes: [...DEFAULT_UNLOCKS.themes], titles: [...DEFAULT_UNLOCKS.titles] };
}

function ensureEquipped(equipped: Record<string, EquippedCosmetics>, userId: string): EquippedCosmetics {
  return equipped[userId] ?? { ...DEFAULT_EQUIPPED };
}

function unlockFieldFor(kind: CosmeticKind): keyof UnlockedCosmetics {
  if (kind === 'frame') return 'frames';
  if (kind === 'theme') return 'themes';
  return 'titles';
}

function equippedFieldFor(kind: CosmeticKind): keyof EquippedCosmetics {
  if (kind === 'frame') return 'frame';
  if (kind === 'theme') return 'theme';
  return 'title';
}

export const useCosmeticsStore = create<CosmeticsState>()(
  persist(
    (set) => ({
      unlocks: {},
      equipped: {},

      unlock: (userId, kind, id) =>
        set((state) => {
          const unlocks = ensureUser(state.unlocks, userId);
          const field = unlockFieldFor(kind);
          const list = unlocks[field];
          if (list.includes(id as never)) {
            // Already unlocked (e.g. starter "default") — no-op write so
            // we still return the same shape but avoid growing the array.
            return {
              unlocks: { ...state.unlocks, [userId]: unlocks },
            };
          }
          const next: UnlockedCosmetics = {
            ...unlocks,
            [field]: [...list, id],
          };
          return { unlocks: { ...state.unlocks, [userId]: next } };
        }),

      equip: (userId, kind, id) =>
        set((state) => {
          const unlocks = ensureUser(state.unlocks, userId);
          const field = unlockFieldFor(kind);
          if (!unlocks[field].includes(id as never)) {
            // Cannot equip something you don't own — silently ignore so
            // the UI doesn't crash if a stale id is passed.
            return state;
          }
          const equipped = ensureEquipped(state.equipped, userId);
          const equippedField = equippedFieldFor(kind);
          const next: EquippedCosmetics = { ...equipped, [equippedField]: id as never };
          return { equipped: { ...state.equipped, [userId]: next } };
        }),

      resetUser: (userId) =>
        set((state) => {
          const unlocks = { ...state.unlocks };
          const equipped = { ...state.equipped };
          delete unlocks[userId];
          delete equipped[userId];
          return { unlocks, equipped };
        }),
    }),
    {
      name: COSMETICS_KEY,
      partialize: (state) => ({ unlocks: state.unlocks, equipped: state.equipped }),
    },
  ),
);

/* ----------------------------- read helpers ----------------------------- */

/** Unlocks for a user — always returns a fully-populated shape (defaults included). */
export function unlocksFor(unlocks: Record<string, UnlockedCosmetics>, userId: string): UnlockedCosmetics {
  return ensureUser(unlocks, userId);
}

/** Equipped cosmetics for a user. */
export function equippedFor(equipped: Record<string, EquippedCosmetics>, userId: string): EquippedCosmetics {
  return ensureEquipped(equipped, userId);
}
