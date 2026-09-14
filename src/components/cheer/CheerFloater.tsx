import { useEffect, useState } from 'react';
import type { CheerEmoji } from '../../store/cheer';
import { cn } from '../../lib/utils';

/**
 * CheerFloater — small layer that renders animated emoji after a send.
 *
 * The Couple page pushes new cheer events into a zustand-backed queue and
 * the floater renders one `<span>` per pending emoji. Each span uses the
 * `float-up` keyframe (defined in `tailwind.config.ts`) so the emoji
 * drifts from the bottom-center of the viewport to just above the top
 * edge with a slight sway + scale.
 *
 * The floaters are absolutely-positioned over the viewport rather than
 * nested in the button that triggered them — that way they always look
 * the same regardless of which tab the user is on, and stacking several
 * at once stays legible.
 */
interface FloaterInstance {
  id: string;
  emoji: CheerEmoji;
}

interface CheerFloaterProps {
  /**
   * Active queue of emojis to animate. The caller (Couple page) is
   * responsible for clearing entries once the animation completes.
   */
  floaters: FloaterInstance[];
  /** Called once a single floater has finished its animation. */
  onComplete: (id: string) => void;
}

export function CheerFloater({ floaters, onComplete }: CheerFloaterProps) {
  if (floaters.length === 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center sm:bottom-32"
    >
      {floaters.map((f, idx) => (
        <Floater
          key={f.id}
          emoji={f.emoji}
          // Spread the floaters horizontally so simultaneous cheers don't
          // perfectly overlap (the visual reads as a "burst" instead of
          // a single emoji duplicating itself).
          offsetX={`${(idx - (floaters.length - 1) / 2) * 36}px`}
          onDone={() => onComplete(f.id)}
        />
      ))}
    </div>
  );
}

interface FloaterProps {
  emoji: CheerEmoji;
  offsetX: string;
  onDone: () => void;
}

function Floater({ emoji, offsetX, onDone }: FloaterProps) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    // The animation runs 1.8s. Add a small grace period then clear.
    const t = window.setTimeout(() => setDone(true), 2000);
    return () => window.clearTimeout(t);
  }, []);
  if (done) {
    onDone();
    return null;
  }
  return (
    <span
      className={cn(
        'absolute bottom-0 select-none text-4xl drop-shadow-sm',
        'animate-float-up will-change-transform',
      )}
      style={{ left: `calc(50% + ${offsetX})`, transform: 'translateX(-50%)' }}
    >
      {emoji}
    </span>
  );
}