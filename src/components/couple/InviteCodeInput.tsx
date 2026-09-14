import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';
import { cn } from '../../lib/utils';
import { INVITE_CODE_LEN } from '../../store/invite';

/**
 * InviteCodeInput — six single-character boxes that auto-advance.
 *
 * Behavior matches the PM's spec:
 *   - Typing a character in box N focuses box N+1.
 *   - Backspace in an empty box moves focus back.
 *   - Arrow keys navigate left/right.
 *   - Pasting a 6-char string fills all six boxes and auto-submits.
 *   - Letters are upper-cased on entry so the shared alphabet (A-Z, 2-9)
 *     matches the user's expectation. Non-alphabet chars are silently
 *     dropped — better than a "wait you typed wrong" error in a flow this
 *     short.
 *
 * The component is uncontrolled-ish: it owns the six boxes' state but
 * surfaces a normalized "value" prop so the parent can validate.
 */

interface InviteCodeInputProps {
  value: string;
  onChange: (next: string) => void;
  /** Called once the user types the Nth char (autofocus + auto-submit). */
  onComplete?: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}

export function InviteCodeInput({ value, onChange, onComplete, disabled, invalid }: InviteCodeInputProps) {
  // Each box reads from `slots[i] ?? ''`. Slicing the parent value into
  // fixed positions means we never have to track per-box state.
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [focused, setFocused] = useState<number | null>(null);

  useEffect(() => {
    // Autofocus the first empty box once on mount so the user can start
    // typing immediately.
    const idx = value.length < INVITE_CODE_LEN ? value.length : INVITE_CODE_LEN - 1;
    inputs.current[idx]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeAt = (idx: number, char: string) => {
    const cleaned = char.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 1);
    if (!cleaned) return;
    const chars = value.padEnd(INVITE_CODE_LEN, ' ').split('');
    chars[idx] = cleaned;
    const next = chars.join('').slice(0, INVITE_CODE_LEN);
    onChange(next);
    if (idx < INVITE_CODE_LEN - 1) inputs.current[idx + 1]?.focus();
    if (next.length === INVITE_CODE_LEN) onComplete?.(next);
  };

  const onInputChange = (idx: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.length > 1) {
      // Paste-style input on a single box (mobile keyboards sometimes
      // dump everything here). Forward into the canonical handler.
      e.preventDefault();
      handlePasteContent(raw, idx);
      return;
    }
    writeAt(idx, raw);
  };

  const onKeyDown = (idx: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!value[idx] || value[idx] === ' ') {
        // Empty box → move back and clear the previous char.
        const prev = Math.max(0, idx - 1);
        const chars = value.padEnd(INVITE_CODE_LEN, ' ').split('');
        chars[prev] = ' ';
        onChange(chars.join('').slice(0, INVITE_CODE_LEN));
        inputs.current[prev]?.focus();
        e.preventDefault();
      } else {
        // Clear current box only.
        const chars = value.padEnd(INVITE_CODE_LEN, ' ').split('');
        chars[idx] = ' ';
        onChange(chars.join('').slice(0, INVITE_CODE_LEN));
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft') {
      inputs.current[Math.max(0, idx - 1)]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      inputs.current[Math.min(INVITE_CODE_LEN - 1, idx + 1)]?.focus();
      e.preventDefault();
    }
  };

  const handlePasteContent = (raw: string, startIdx = 0) => {
    const cleaned = raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, INVITE_CODE_LEN);
    if (cleaned.length === 0) return;
    const chars = value.padEnd(INVITE_CODE_LEN, ' ').split('');
    for (let i = 0; i < cleaned.length; i += 1) {
      chars[startIdx + i] = cleaned[i]!;
    }
    const next = chars.join('').slice(0, INVITE_CODE_LEN);
    onChange(next);
    const focusIdx = Math.min(INVITE_CODE_LEN - 1, startIdx + cleaned.length);
    inputs.current[focusIdx]?.focus();
    if (next.length === INVITE_CODE_LEN) onComplete?.(next);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    handlePasteContent(text);
  };

  return (
    <div
      className="flex items-center gap-1.5 sm:gap-2"
      role="group"
      aria-label="Invite code"
      onPaste={onPaste}
    >
      {Array.from({ length: INVITE_CODE_LEN }, (_, i) => {
        const ch = (value[i] ?? '').trim();
        return (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            maxLength={i === 0 ? INVITE_CODE_LEN : 1}
            value={ch}
            disabled={disabled}
            onChange={onInputChange(i)}
            onKeyDown={onKeyDown(i)}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused(null)}
            aria-label={`Code character ${i + 1}`}
            className={cn(
              'h-12 w-10 sm:h-14 sm:w-12 rounded-lg border bg-[rgb(var(--bg-surface))] text-center font-mono text-xl sm:text-2xl font-semibold uppercase tracking-wide',
              'transition-colors duration-150',
              'focus:outline-none',
              invalid
                ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/30'
                : focused === i
                  ? 'border-brand-500 ring-2 ring-brand-500/30'
                  : 'border-[rgb(var(--border-default))] focus:border-brand-500',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          />
        );
      })}
    </div>
  );
}