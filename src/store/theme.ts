import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  /** Resolved theme (what's actually applied to the DOM). `null` until first compute. */
  resolved: 'light' | 'dark' | null;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  /** Re-compute from system preference. Call when `prefers-color-scheme` changes. */
  syncFromSystem: () => void;
}

const STORAGE_KEY = 'pairfit:theme';

function computeResolved(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function applyToDom(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  // Helps the browser pick the right status-bar color on mobile.
  root.style.colorScheme = resolved;
}

/**
 * Theme store. Persisted to `localStorage` under `pairfit:theme`. The DOM is
 * kept in sync via `applyToDom` so the rest of the app can simply rely on
 * Tailwind's `dark:` variants.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolved: null,
      setMode: (mode) => {
        const resolved = computeResolved(mode);
        applyToDom(resolved);
        set({ mode, resolved });
      },
      toggle: () => {
        const current = get().resolved ?? 'light';
        const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
        const resolved = computeResolved(next);
        applyToDom(resolved);
        set({ mode: next, resolved });
      },
      syncFromSystem: () => {
        if (get().mode !== 'system') return;
        const resolved = computeResolved('system');
        applyToDom(resolved);
        set({ resolved });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, apply the saved preference immediately.
        if (state) {
          const resolved = computeResolved(state.mode);
          applyToDom(resolved);
          state.resolved = resolved;
        }
      },
    },
  ),
);

/**
 * Subscribe to system-level color-scheme changes. Call once at app boot.
 */
export function bindSystemThemeListener(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => useThemeStore.getState().syncFromSystem();
  // Older Safari uses `addListener`; modern browsers support `addEventListener`.
  if (mq.addEventListener) {
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }
  mq.addListener(handler);
  return () => mq.removeListener(handler);
}
