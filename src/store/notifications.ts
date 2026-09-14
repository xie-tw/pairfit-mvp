import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Notification preferences — PF-9.
 *
 * PairFit MVP doesn't have real push delivery; V1.1 hooks this up to the
 * cloud account. The store still exists today because:
 *   1. The Settings page needs a visible UI control (the requirement is
 *      "real-time toggle, real push in V1.1").
 *   2. We want to ship the user-preference plumbing now so flipping the
 *      backend on later doesn't require a schema migration.
 *
 * Toggles are keyed per category (goal / cheer / weekly) so a future
 * "Push provider" only has to read this map.
 */

export type NotificationCategory = 'goal' | 'cheer' | 'weekly';

export interface NotificationPrefs {
  goal: boolean;
  cheer: boolean;
  weekly: boolean;
}

interface NotificationState {
  prefs: NotificationPrefs;
  setEnabled: (category: NotificationCategory, enabled: boolean) => void;
}

const STORAGE_KEY = 'pairfit:notifications';

const DEFAULTS: NotificationPrefs = {
  goal: true,
  cheer: true,
  weekly: true,
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      prefs: { ...DEFAULTS },
      setEnabled: (category, enabled) =>
        set((state) => ({
          prefs: { ...state.prefs, [category]: enabled },
        })),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ prefs: state.prefs }),
    },
  ),
);