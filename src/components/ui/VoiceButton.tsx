import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  createVoiceRecognition,
  isVoiceSupported,
  parseWeightFromTranscript,
  type VoiceErrorCode,
  type VoiceRecognition,
} from '../../lib/voice';

/**
 * VoiceButton — long-press to record.
 *
 * Design intent (per `docs/design-handoff/components/voice-button.md`):
 *   - Press → start recognition, animate a pulsing ring.
 *   - Release → stop, parse the transcript, call `onResult(transcript, number)`.
 *   - Failure → call `onError(code)` so the page can show a toast.
 *
 * We try to keep the visual calm: the only moving parts while recording
 * are the ring + 5 little bars (waveform). When idle the button looks
 * identical to a plain mic icon, which keeps the "voice is optional"
 * promise from the PRD front-and-center.
 *
 * Number parsing is built-in for `type="weight"`. For `type="food"` and
 * `type="exercise"` we don't try to be clever — those land in PF-4/PF-5,
 * and a generic `onResult(text)` callback is enough for now.
 */
export type VoiceType = 'weight' | 'food' | 'exercise' | 'generic';

export interface VoiceButtonProps {
  type?: VoiceType;
  onResult: (transcript: string, parsed: number | null) => void;
  onError?: (code: VoiceErrorCode) => void;
  /** ARIA label override. Defaults to a localized "voice" string. */
  ariaLabel?: string;
  size?: 'md' | 'lg';
  className?: string;
}

interface WaveState {
  /** Five bars; each value is 0..1, representing recent audio level. */
  bars: number[];
}

const IDLE_WAVE: WaveState = { bars: [0.25, 0.45, 0.7, 0.45, 0.25] };

export function VoiceButton({
  type = 'generic',
  onResult,
  onError,
  ariaLabel,
  size = 'lg',
  className,
}: VoiceButtonProps) {
  const supported = isVoiceSupported();
  const [pressed, setPressed] = useState(false);
  const [wave, setWave] = useState<WaveState>(IDLE_WAVE);
  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const timerRef = useRef<number | null>(null);

  // Spin the waveform while pressed. Cheap `setInterval` would be fine, but
  // we use a self-scheduling RAF so the bars animate at ~20fps with random
  // jitter — reads as "responding to my voice" without going over the top.
  useEffect(() => {
    if (!pressed) return undefined;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setWave({
        bars: Array.from({ length: 5 }, () => 0.3 + Math.random() * 0.7),
      });
      timerRef.current = window.setTimeout(tick, 90);
    };
    tick();
    return () => {
      cancelled = true;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pressed]);

  // Tear down the recognizer on unmount.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = () => {
    if (!supported) {
      onError?.('not-supported');
      return;
    }
    finalTranscriptRef.current = '';
    const rec = createVoiceRecognition();
    if (!rec) {
      onError?.('not-supported');
      return;
    }
    recognitionRef.current = rec;

    rec.onResult((event) => {
      if (event.isFinal) {
        finalTranscriptRef.current = event.transcript;
      } else {
        // Interim — keep updating so the user can see "yes it's hearing me"
        finalTranscriptRef.current = event.transcript;
      }
    });
    rec.onError((code) => {
      onError?.(code);
      setPressed(false);
    });
    rec.onEnd(() => {
      // Native `onend` fires for both success and error paths. We only
      // fire `onResult` if we have a transcript — error codes have already
      // been routed through `onError`.
      const transcript = finalTranscriptRef.current.trim();
      setPressed(false);
      if (!transcript) return;
      const parsed = type === 'weight' ? parseWeightFromTranscript(transcript) : null;
      onResult(transcript, parsed);
    });

    rec.start();
  };

  const stop = () => {
    recognitionRef.current?.stop();
  };

  const handlePressStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Don't trigger on right-click or auxiliary buttons.
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setPressed(true);
    start();
  };

  const handlePressEnd = () => {
    if (!pressed) return;
    stop();
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Some browsers deliver `click` after `pointerup`; ignore so we don't
    // double-trigger. The pointer handlers cover the lifecycle.
    e.preventDefault();
  };

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        aria-label={ariaLabel ?? 'Voice input not supported'}
        title="Voice input not supported"
        className={cn(
          'inline-flex items-center justify-center rounded-full border border-dashed border-[rgb(var(--border-default))] bg-[rgb(var(--bg-sunken))] text-[rgb(var(--fg-subtle))]',
          size === 'lg' ? 'size-16' : 'size-12',
          className,
        )}
      >
        <MicOff className={size === 'lg' ? 'size-6' : 'size-4'} aria-hidden />
      </button>
    );
  }

  const dimension = size === 'lg' ? 'size-16' : 'size-12';
  const iconSize = size === 'lg' ? 'size-6' : 'size-4';

  return (
    <button
      type="button"
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
      onPointerCancel={handlePressEnd}
      onClick={handleClick}
      aria-label={ariaLabel ?? 'Hold to record'}
      aria-pressed={pressed}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full text-white shadow-md transition-transform duration-200 ease-out-quart',
        'bg-brand-500 hover:bg-brand-600 active:bg-brand-700',
        'pf-press',
        dimension,
        className,
      )}
    >
      {pressed ? (
        <>
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-brand-500/50"
            style={{ animationDuration: '1.2s' }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full ring-4 ring-brand-500/30"
          />
        </>
      ) : null}
      <span className="relative flex items-center gap-0.5">
        <Mic className={iconSize} aria-hidden />
        {pressed ? (
          <span className="ml-1 flex items-end gap-[2px]">
            {wave.bars.map((level, idx) => (
              <span
                key={idx}
                aria-hidden
                className="w-[3px] rounded-full bg-white/90"
                style={{ height: `${Math.round(level * 14) + 4}px` }}
              />
            ))}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/**
 * Convenience type re-export so pages can pick the right icon next to the
 * button without importing lucide directly. Keeps the surface small.
 */
export const VOICE_ICON: LucideIcon = Mic;
