import { useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';
import type { CheerEmoji } from '../../store/cheer';

/**
 * CheerButton — a single emoji tap that fires a cheer + plays a chirp.
 *
 * Audio:
 *   We lazily build a `AudioContext` on the first user gesture so iOS
 *   Safari (which blocks audio until interaction) doesn't error out.
 *   The chirp is a short two-note sine ping — cheap to schedule and
 *   nothing to ship / cache.
 *
 * Animation:
 *   The button just hands the `CheerFloater` an emoji id; the floater is
 *   owned by the parent (Couple page) so multiple cheers stack cleanly.
 *
 * Disabled states:
 *   - `disabled` (from outside) — covers "no partner bound" etc.
 *   - `loading` — a brief post-tap lock so a panicked double-tap doesn't
 *     double-fire and waste a daily slot.
 */

interface CheerButtonProps {
  emoji: CheerEmoji;
  label: string;
  onTap: (emoji: CheerEmoji) => void;
  disabled?: boolean;
  /** Visual variant — secondary is the default pill, primary is the active state. */
  variant?: 'secondary' | 'accent';
}

export function CheerButton({ emoji, label, onTap, disabled, variant = 'secondary' }: CheerButtonProps) {
  const audioRef = useRef<AudioContext | null>(null);
  const lockRef = useRef(false);

  const playChirp = useCallback(() => {
    try {
      // Create the context on the first user gesture. Subsequent gestures
      // re-use it. iOS throws if you call `new AudioContext()` outside a
      // user gesture — the try/catch keeps the click working even when
      // audio is unavailable.
      if (!audioRef.current) {
        const Ctor =
          (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        audioRef.current = new Ctor();
      }
      const ctx = audioRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;
      // Two-note chirp — C5 → G5 over 120ms.
      const notes = [523.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.0001, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.2);
      });
    } catch {
      // Silent — audio is decoration, not a deliverable.
    }
  }, []);

  const handleClick = () => {
    if (disabled || lockRef.current) return;
    lockRef.current = true;
    window.setTimeout(() => {
      lockRef.current = false;
    }, 280);
    playChirp();
    onTap(emoji);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'pf-press group inline-flex h-12 min-w-[3rem] flex-1 select-none flex-col items-center justify-center gap-0.5 rounded-xl border text-lg transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg-app))]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'accent'
          ? 'border-brand-500 bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-500/15 dark:text-brand-100'
          : 'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] hover:border-brand-500/40 hover:bg-[rgb(var(--bg-sunken))]',
      )}
    >
      <span className="text-2xl leading-none transition-transform duration-150 group-hover:scale-110 group-active:scale-95">
        {emoji}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-[rgb(var(--fg-subtle))]">
        {label}
      </span>
    </button>
  );
}