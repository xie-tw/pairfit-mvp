/**
 * Form validation helpers for the auth + profile flows.
 *
 * Rules mirror the PF-2 acceptance criteria:
 *   - Email must look like an email (RFC-ish).
 *   - Password ≥ 8 chars, must contain at least one letter AND one digit.
 *   - Display name 1–32 chars (trimmed).
 *
 * Each helper returns a `string | null` so the form can render the first
 * failing reason in place. `validateAuthForm` rolls up the three checks
 * against an `AuthFormValues` payload — keeps the page components dumb.
 */

export const PASSWORD_MIN = 8;
export const DISPLAY_NAME_MAX = 32;

export interface AuthFormValues {
  email: string;
  password: string;
  confirmPassword?: string;
  displayName?: string;
}

/** RFC-5322 is overkill for a client-side MVP; this catches the obvious typos. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export interface PasswordIssue {
  /** Short, i18n-friendly code — the page picks the user-facing string. */
  code: 'tooShort' | 'noLetter' | 'noDigit';
}

export function checkPassword(password: string): PasswordIssue | null {
  if (password.length < PASSWORD_MIN) return { code: 'tooShort' };
  if (!/[A-Za-z]/.test(password)) return { code: 'noLetter' };
  if (!/\d/.test(password)) return { code: 'noDigit' };
  return null;
}

export function isValidDisplayName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= DISPLAY_NAME_MAX;
}

export type AuthFormError =
  | { field: 'email'; code: 'required' | 'invalid' }
  | { field: 'password'; code: 'required' | 'tooShort' | 'noLetter' | 'noDigit' }
  | { field: 'confirmPassword'; code: 'required' | 'mismatch' }
  | { field: 'displayName'; code: 'required' | 'tooLong' };

/**
 * Validate an auth form payload. Returns the **first** error so the page
 * can focus that field. Confirm-password is only checked when supplied, so
 * the same helper covers login (no confirm) and register (with confirm).
 */
export function validateAuthForm(values: AuthFormValues): AuthFormError | null {
  const email = values.email.trim();
  if (!email) return { field: 'email', code: 'required' };
  if (!isValidEmail(email)) return { field: 'email', code: 'invalid' };

  if (!values.password) return { field: 'password', code: 'required' };
  const pwIssue = checkPassword(values.password);
  if (pwIssue) return { field: 'password', code: pwIssue.code };

  if (values.confirmPassword !== undefined) {
    if (!values.confirmPassword) return { field: 'confirmPassword', code: 'required' };
    if (values.confirmPassword !== values.password) {
      return { field: 'confirmPassword', code: 'mismatch' };
    }
  }

  if (values.displayName !== undefined) {
    const name = values.displayName.trim();
    if (!name) return { field: 'displayName', code: 'required' };
    if (name.length > DISPLAY_NAME_MAX) return { field: 'displayName', code: 'tooLong' };
  }

  return null;
}