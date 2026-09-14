import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Settings2 } from 'lucide-react';
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
 * Permission state machine (BUG-FIX-1):
 *   - `idle`         — default; long-press to ask the browser for permission.
 *   - `requesting`   — recognizer is starting up (avoids double-fires).
 *   - `listening`    — actively capturing audio.
 *   - `denied`       — the user (or their OS) blocked the microphone. The
 *                      button degrades to a "Mic blocked · Open settings"
 *                      pill; we DO NOT keep spamming toasts on every press.
 *                      A "Retry" affordance lets the user re-prompt after
 *                      flipping the browser-level switch (some browsers will
 *                      ask again, others stay denied — both are valid).
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

type PermissionState = 'idle' | 'requesting' | 'listening' | 'denied';

const IDLE_WAVE: WaveState = { bars: [0.25, 0.45, 0.7, 0.45, 0.25] };

export function VoiceButton({
  type = 'generic',
  onResult,
  onError,
  ariaLabel,
  size = 'lg',
  className,
}: VoiceButtonProps) {
  const { t } = useTranslation();
  const supported = isVoiceSupported();
  const [pressed, setPressed] = useState(false);
  const [wave, setWave] = useState<WaveState>(IDLE_WAVE);
  const [permission, setPermission] = useState<PermissionState>('idle');
  // Track whether the parent has already shown a "denied" toast for this
  // denial session, so subsequent presses don't re-fire it. The component
  // re-arms the flag when the user explicitly retries.
  const denialToastFiredRef = useRef(false);
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

  const beginRequest = () => {
    // Re-arm the toast flag on every fresh request so a successful retry
    // (the user toggled browser permissions on) gets a fresh attempt.
    denialToastFiredRef.current = false;
    setPermission('requesting');
    const rec = createVoiceRecognition();
    if (!rec) {
      setPermission('denied');
      if (!denialToastFiredRef.current) {
        denialToastFiredRef.current = true;
        onError?.('not-supported');
      }
      return;
    }
    recognitionRef.current = rec;
    finalTranscriptRef.current = '';

    rec.onResult((event) => {
      if (event.isFinal) {
        finalTranscriptRef.current = event.transcript;
      } else {
        // Interim — keep updating so the user can see "yes it's hearing me"
        finalTranscriptRef.current = event.transcript;
      }
    });
    rec.onError((code) => {
      // Map the underlying permission denial into our UI state. Note that
      // `not-allowed` is sticky until the user re-tries — we don't bounce
      // back to `idle` on a denial, so we stop emitting noisy toasts.
      if (code === 'not-allowed' || code === 'audio-capture') {
        setPermission('denied');
        setPressed(false);
        if (!denialToastFiredRef.current) {
          denialToastFiredRef.current = true;
          onError?.('not-allowed');
        }
        return;
      }
      setPermission('idle');
      setPressed(false);
      onError?.(code);
    });
    rec.onEnd(() => {
      // Native `onend` fires for both success and error paths. We only
      // fire `onResult` if we have a transcript — error codes have already
      // been routed through `onError`.
      const transcript = finalTranscriptRef.current.trim();
      setPressed(false);
      setPermission((prev) => (prev === 'requesting' ? 'idle' : prev));
      if (!transcript) return;
      const parsed = type === 'weight' ? parseWeightFromTranscript(transcript) : null;
      onResult(transcript, parsed);
    });

    try {
      rec.start();
      // The browser will either prompt (Chrome / Edge) or fail immediately
      // (Firefox / denied sites). We optimistically flip to `listening`;
      // the `onerror` handler will pull us back to `denied` if the prompt
      // gets refused.
      setPermission('listening');
    } catch {
      setPermission('denied');
      if (!denialToastFiredRef.current) {
        denialToastFiredRef.current = true;
        onError?.('not-allowed');
      }
    }
  };

  const stop = () => {
    recognitionRef.current?.stop();
  };

  const handlePressStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Don't trigger on right-click or auxiliary buttons.
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    // In `denied` mode the visible control is the "Try mic again" pill —
    // ignore stray pointer events here. The retry pill handles re-prompts.
    if (permission === 'denied') return;
    if (permission !== 'idle') return;
    setPressed(true);
    beginRequest();
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

  const handleRetry = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Don't let the click bubble to a wrapping form's submit handler.
    e.preventDefault();
    e.stopPropagation();
    // Tear down any half-alive recognizer before retrying.
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setPressed(false);
    beginRequest();
  };

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        aria-label={ariaLabel ?? t('voice.not_supported')}
        title={t('voice.not_supported')}
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

  // Denied state — degrade to a "mic blocked" pill with a retry affordance.
  // The pill is shaped like the button so the layout doesn't jump, but the
  // body color softens to grey and the icon swaps to a settings glyph so
  // the user can read the affordance at a glance.
  if (permission === 'denied') {
    return (
      <button
        type="button"
        onClick={handleRetry}
        aria-label={t('voice.denied')}
        title={t('voice.denied')}
        data-state="denied"
        className={cn(
          'group relative inline-flex items-center justify-center gap-2 rounded-full border border-dashed border-[rgb(var(--border-strong))] bg-[rgb(var(--bg-sunken))] px-4 text-[rgb(var(--fg-secondary))] shadow-sm transition-colors duration-150 ease-out hover:bg-[rgb(var(--bg-surface))]',
          size === 'lg' ? 'h-16 text-sm font-medium' : 'h-12 px-3 text-xs font-medium',
          className,
        )}
      >
        <MicOff className={size === 'lg' ? 'size-5' : 'size-4'} aria-hidden />
        <span className="flex flex-col items-start leading-tight">
          <span>{t('voice.deniedLabel')}</span>
          <span className="text-[10px] font-normal text-[rgb(var(--fg-subtle))]">
            {t('voice.deniedActionLabel')}
          </span>
        </span>
        <Settings2 className={size === 'lg' ? 'size-4' : 'size-3.5'} aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
      onPointerCancel={handlePressEnd}
      onClick={handleClick}
      aria-label={ariaLabel ?? t('voice.press_to_speak')}
      aria-pressed={pressed}
      data-state={permission}
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
