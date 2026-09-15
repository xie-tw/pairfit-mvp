/**
 * Data export + clear — PF-9.
 *
 * PairFit's MVP data lives in `localStorage` under well-known keys (one
 * per zustand `persist` store). This module is the single switchboard
 * for "snapshot everything to JSON" and "wipe it all back to factory".
 *
 * Two reasons it's centralized:
 *   1. New stores added in future PF-* only need to be appended to the
 *      `KNOWN_KEYS` list, not hunted across the codebase.
 *   2. The Settings page can't import every store directly (would couple
 *      Settings to weight / food / goal internals) — reading the raw
 *      `localStorage` keeps the export flow store-agnostic.
 *
 * SECURITY: the export is unobfuscated. Whoever has the JSON can read
 * emails + display names. That's intentional — the export is for the
 * user's own backup, not for sharing. The auth store keeps XOR for
 * in-place storage precisely so casual DevTools snooping is awkward.
 */

import { deobfuscate } from './storage';

/**
 * Every `localStorage` key PairFit owns. Unknown keys are left alone
 * (e.g. Vercel's `__vercel` markers, browser extension state) so wiping
 * doesn't brick the page.
 *
 * PF-8 added the weekly-report cache and partner-data hook so an export
 * needs to sweep those too — the previous list silently dropped them,
 * which made re-imports on a fresh device lose the cached AI summary.
 */
export const KNOWN_KEYS: readonly string[] = [
  'pairfit:users',
  'pairfit:auth',
  'pairfit:locale',
  'pairfit:theme',
  'pairfit:goal',
  'pairfit:weights',
  'pairfit:food',
  'pairfit:exercise',
  'pairfit:couple',
  'pairfit:invite',
  'pairfit:cheers',
  'pairfit:weeklyReport',
  'pairfit:notifications',
  'pairfit:coins',
  'pairfit:cosmetics',
  'pairfit:notificationCenter',
  'pairfit:i18nLng',
];

/**
 * Export every owned key as a single JSON document. The `users` slot is
 * round-tripped through `deobfuscate` so the export shows real values,
 * not XOR base64 — the user is the legitimate owner of the data.
 */
export interface SnapshotPayload {
  /** Schema version — bumped on breaking shape changes so users can re-import. */
  schema: 1;
  /** Wall-clock the snapshot was taken. */
  exportedAt: string;
  /** App version, sourced from `package.json` at build time. */
  appVersion: string;
  /** Each known key → its raw value (parsed if possible). */
  data: Record<string, unknown>;
}

export function snapshotAllData(): SnapshotPayload {
  const data: Record<string, unknown> = {};
  for (const key of KNOWN_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    if (key === 'pairfit:users') {
      // Deobfuscate so the JSON shows real account fields, not XOR.
      const decoded = deobfuscate<{ state?: { users?: unknown[] } }>(raw);
      if (decoded?.state?.users) {
        data[key] = decoded.state.users;
      } else {
        // Pre-obfuscation build — fall back to raw JSON.
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw;
        }
      }
      continue;
    }
    try {
      data[key] = JSON.parse(raw);
    } catch {
      // Unknown / non-JSON payload — keep the raw string.
      data[key] = raw;
    }
  }
  return {
    schema: 1,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data,
  };
}

/**
 * Build a download for the snapshot and click it. Uses a transient anchor
 * so no global state is left behind; the URL is revoked after the click.
 *
 * File name follows the PRD §4 export spec:
 *   `pairfit-export-{userId}-{YYYY-MM-DD}.json`
 * Falls back to `pairfit-export-anon-{date}.json` when no user is signed
 * in so the file is still uniquely named.
 */
export function downloadSnapshot(): void {
  const payload = snapshotAllData();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const userId = currentUserIdFromPayload(payload) ?? 'anon';
  const a = document.createElement('a');
  a.href = url;
  a.download = `pairfit-export-${userId}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Yield a tick so Safari has time to start the download before revoke.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Pull the current user's id from the obfuscated `pairfit:users` slot. */
function currentUserIdFromPayload(payload: SnapshotPayload): string | null {
  const authRaw = payload.data['pairfit:auth'];
  if (!authRaw || typeof authRaw !== 'object') return null;
  const auth = authRaw as { state?: { currentUserId?: unknown } };
  const id = auth.state?.currentUserId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Remove every PairFit-owned key from localStorage. Returns the list of
 * keys that were cleared so the caller can log / toast.
 */
export function wipeAllLocalData(): string[] {
  const cleared: string[] = [];
  for (const key of KNOWN_KEYS) {
    if (localStorage.getItem(key) === null) continue;
    localStorage.removeItem(key);
    cleared.push(key);
  }
  return cleared;
}

// Version is injected at build time via `define` in `vite.config.ts`.
// Falling back to the literal keeps dev / test environments working even
// without the Vite plugin.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __APP_VERSION__: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const APP_VERSION: string = (globalThis as any).__APP_VERSION__ ?? '0.1.0';