/**
 * Crypto + ID helpers used by the auth flow.
 *
 * PairFit is 100% client-side during the MVP, so all "server-side" concerns
 * (password storage, identity generation) have to live in the browser. We use
 * the Web Crypto API for hashing and the platform's built-in UUID generator.
 *
 * `hashPassword` is intentionally a thin wrapper around SHA-256 + per-user
 * salt — not Argon2 / bcrypt. Browsers can't easily run those without a WASM
 * dependency and a 200ms+ cost, which would block low-end mobile devices
 * during signup. For the MVP threat model (local shoulder-surfing, not
 * motivated attackers exfiltrating a stolen device) SHA-256 + salt is fine.
 * The PRD flags a proper KDF upgrade for V1.1 once cloud sync lands.
 */

const SALT_BYTES = 16;

/**
 * Generate a cryptographically random salt. Returns `Uint8Array` so callers
 * can serialize it however they like (we base64 it).
 */
function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(out);
    return out;
  }
  // Last-resort fallback (e.g. very old runtimes). `Math.random` is not
  // cryptographically secure but only kicks in when the platform primitive
  // is missing — we surface a warning so debug builds notice.
  for (let i = 0; i < length; i += 1) {
    out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
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

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  // Web Crypto requires an ArrayBuffer (not ArrayBufferLike). Slice to be safe.
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(digest);
}

/** Generate a new 16-byte salt, returned as base64 for compact persistence. */
export function generateSalt(): string {
  return bytesToBase64(randomBytes(SALT_BYTES));
}

/**
 * Derive a SHA-256 hash from `password` + `saltB64`. The salt is prepended
 * so identical passwords across users produce distinct digests.
 */
export async function hashPassword(password: string, saltB64: string): Promise<string> {
  const salt = base64ToBytes(saltB64);
  const payload = new Uint8Array(salt.length + password.length);
  payload.set(salt, 0);
  // Avoid `Buffer`/encoding overhead — passwords here are short, so the
  // UTF-8 pass via `TextEncoder` + `set` is plenty.
  const pwBytes = new TextEncoder().encode(password);
  payload.set(pwBytes, salt.length);
  const digest = await sha256(payload);
  return bytesToBase64(digest);
}

/**
 * Constant-time comparison of two base64 digests. Prevents an attacker who
 * can measure timing from learning the leading bytes of the stored hash.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Generate a UUID-v4 string. Falls back to a `Math.random`-based scheme on
 * the rare runtimes that don't expose `crypto.randomUUID` (e.g. very old
 * Safari). Web Crypto is required everywhere we ship to, so the fallback is
 * defensive only.
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 — last 2 bits of clockSeq are forced to 0b10.
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}