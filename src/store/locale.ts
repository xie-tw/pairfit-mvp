import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';

export type LocaleCode = 'en' | 'zh';

interface LocaleState {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'pairfit:locale';

/**
 * Locale store. The actual translation engine lives in `src/i18n` (i18next);
 * this store is the source of truth that:
 *   1. Persists user choice across reloads.
 *   2. Pushes the choice into i18next so all `useTranslation()` callers re-render.
 */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: 'en',
      setLocale: (locale) => {
        void i18n.changeLanguage(locale);
        set({ locale });
      },
      toggle: () => {
        const next: LocaleCode = get().locale === 'en' ? 'zh' : 'en';
        void i18n.changeLanguage(next);
        set({ locale: next });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        // Sync the i18next instance to whatever was persisted before any
        // component mounts — otherwise the first render flashes English.
        if (state?.locale) {
          void i18n.changeLanguage(state.locale);
        }
      },
    },
  ),
);
