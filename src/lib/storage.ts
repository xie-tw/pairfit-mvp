/**
 * Lightweight localStorage obfuscation.
 *
 * PairFit is a local-first MVP — every byte lives in `window.localStorage`,
 * which any user with DevTools can read. To make accidental snooping less
 * trivial (think shoulder-surfing, or someone pointing their friend at
 * their browser) we apply an XOR pass over the JSON payload and then base64
 * encode the result.
 *
 * ⚠️ This is **NOT** real encryption. The XOR key is shipped in the bundle
 * so a determined attacker can recover it. The goal is to dodge the
 * "store-password-in-plaintext" anti-pattern during the MVP without
 * shipping WebCrypto-across-the-whole-app on day one. The PRD tracks a
 * follow-up to swap this for a proper key-derivation path in V1.1.
 */

const OBFUSCATION_KEY = 'pairfit-mvp-v1::obfuscation::key';

function bytesToBase64(bytes: Uint8Array): string {
  // `btoa` only accepts binary strings — use `String.fromCharCode` to bridge.
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function xor(input: Uint8Array, key: string): Uint8Array {
  const out = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    // `charCodeAt(i % key.length)` keeps the keystream in sync with payload.
    out[i] = input[i]! ^ key.charCodeAt(i % key.length);
  }
  return out;
}

/**
 * Encode a JS value to an obfuscated string suitable for `localStorage`.
 * Returns `null` when called outside a browser (SSR / tests).
 */
export function obfuscate(value: unknown): string | null {
  if (typeof window === 'undefined') return null;
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64(xor(bytes, OBFUSCATION_KEY));
}

/**
 * Reverse `obfuscate`. Returns `null` for missing / corrupt payloads — never
 * throws, so callers don't have to wrap each read in try/catch.
 */
export function deobfuscate<T>(payload: string | null | undefined): T | null {
  if (!payload) return null;
  if (typeof window === 'undefined') return null;
  try {
    const bytes = base64ToBytes(payload);
    const json = new TextDecoder().decode(xor(bytes, OBFUSCATION_KEY));
    return JSON.parse(json) as T;
  } catch {
    // Corrupt or unencrypted legacy entry — silently drop so the caller
    // can re-seed without the user seeing an error toast.
    return null;
  }
}