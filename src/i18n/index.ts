import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zh from './locales/zh.json';

/**
 * PairFit uses i18next as the runtime translation engine. We register the
 * detector so the browser's preferred language is honored on first visit, and
 * persist user choices through the `useLocaleStore` (which calls
 * `i18n.changeLanguage` on top of detection).
 *
 * English is the default — the PRD specifies English-first, with Chinese as a
 * secondary tier for the Chinese-speaking market.
 */
export const SUPPORTED_LOCALES = ['en', 'zh'] as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LOCALES],
    interpolation: {
      escapeValue: false, // React already escapes values.
    },
    detection: {
      // We only honor the browser default initially; user choice is owned by
      // the locale store (localStorage-backed).
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'pairfit:i18nLng',
      caches: ['localStorage'],
    },
    returnNull: false,
  });

export default i18n;
