/**
 * Web Speech API wrapper + number parser.
 *
 * Why a wrapper instead of calling `new SpeechRecognition()` directly:
 *   1. The API is namespaced differently between Chromium (`webkitSpeechRecognition`)
 *      and Firefox/Safari (`SpeechRecognition`). We pick whichever is present.
 *   2. We need a Promise surface — the raw API is callback-shaped, and
 *      every consumer (weight, food, exercise) wants the same UX: start on
 *      press, stop on release, resolve with a transcript.
 *   3. Parsing — "今天 65.5 公斤" needs to become `65.5`. The browser
 *      gives us text; the rest is ours.
 *
 * Browser support (MVP):
 *   - Chrome / Edge / Opera  : full support.
 *   - Safari (macOS / iOS)   : partial — `SpeechRecognition` was added in
 *                              Safari 14.1; `webkitSpeechRecognition` exists
 *                              on older builds. Either way it's flaky.
 *   - Firefox               : no implementation. We surface a clean "not
 *                              supported" error so callers fall back.
 */

export interface VoiceRecognition {
  start(): void;
  stop(): void;
  abort(): void;
  /** Subscribe to interim + final transcripts. Returns an unsubscribe fn. */
  onResult(cb: (event: VoiceResult) => void): () => void;
  /** Fires with a `VoiceErrorCode` when the session ends unsuccessfully. */
  onError(cb: (code: VoiceErrorCode) => void): () => void;
  /** Fires when the session ends for any reason (incl. success). */
  onEnd(cb: () => void): () => void;
  /** `true` while the recognizer is capturing audio. */
  isListening(): boolean;
}

export interface VoiceResult {
  /** Final transcript for this session. */
  transcript: string;
  /** Confidence from 0 to 1. Web Speech only — may be `0` on Safari. */
  confidence: number;
  /** `true` once the user has stopped speaking. */
  isFinal: boolean;
}

/**
 * Stable codes — the UI maps these to i18n strings, not the raw error
 * names. Errors are spec'd in `docs/design-handoff/interaction-spec.md`
 * §3.2 — keep this enum in sync with that table.
 */
export type VoiceErrorCode =
  | 'no-speech'
  | 'no-match'
  | 'audio-capture'
  | 'not-allowed'
  | 'network'
  | 'aborted'
  | 'not-supported'
  | 'unknown';

/**
 * Detect SpeechRecognition support at runtime. Returns the constructor
 * or `null` if the browser doesn't ship one (Firefox today).
 */
function getSpeechRecognitionCtor(): (new () => AnySpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => AnySpeechRecognition;
    webkitSpeechRecognition?: new () => AnySpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface AnySpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: AnySpeechResultEvent) => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface AnySpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal?: boolean }>;
}

export function isVoiceSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

/**
 * Create a one-shot speech-recognition session. Callers wire up the
 * callbacks, then call `start()` and `stop()`. Internally we wrap the
 * native callback API so consumers see a Promise-like subscription.
 */
export function createVoiceRecognition(options: { lang?: string } = {}): VoiceRecognition | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;
  const instance = new Ctor();
  instance.lang = options.lang ?? resolveLang();
  instance.continuous = false;
  instance.interimResults = true;
  instance.maxAlternatives = 1;

  let listening = false;
  const resultSubs = new Set<(r: VoiceResult) => void>();
  const errorSubs = new Set<(c: VoiceErrorCode) => void>();
  const endSubs = new Set<() => void>();

  instance.onresult = (event) => {
    // BUG-FIX-5: emit the *latest* recognized segment as the payload, not
    // an accumulation across `event.results`. The W3C Web Speech API spec
    // defines `resultIndex` as the first new entry; entries before it are
    // stale references from earlier events. Concatenating across them
    // double-counts transcripts and, when an `onresult` event carries more
    // than one new interim index, can glue unrelated segments together.
    //
    // VoiceButton updates its own ref on every callback, so emitting a
    // single transcript per event is enough — `interimResults: true`
    // means the browser will keep firing this handler, overwriting the
    // ref each time, until the final result lands.
    const lastIndex = event.results.length - 1;
    if (lastIndex < event.resultIndex) return;
    const last = event.results[lastIndex];
    if (!last) return;
    const alt = last[0];
    if (!alt) return;
    const text = alt.transcript.trim();
    if (!text) return;
    const payload: VoiceResult = {
      transcript: text,
      confidence: alt.confidence,
      isFinal: Boolean(last.isFinal),
    };
    resultSubs.forEach((cb) => cb(payload));
  };

  instance.onerror = (event) => {
    const code = normalizeError(event.error);
    errorSubs.forEach((cb) => cb(code));
  };

  instance.onend = () => {
    listening = false;
    endSubs.forEach((cb) => cb());
  };

  return {
    start() {
      listening = true;
      try {
        instance.start();
      } catch {
        // Chrome throws if you call `start()` twice in a row. Treat as
        // a no-op; the consumer's `onerror` will pick up real failures.
        listening = false;
      }
    },
    stop() {
      try {
        instance.stop();
      } catch {
        // Same as above — `stop()` after `onend` is harmless but may throw.
      }
    },
    abort() {
      try {
        instance.abort();
      } catch {
        /* noop */
      }
    },
    onResult(cb) {
      resultSubs.add(cb);
      return () => resultSubs.delete(cb);
    },
    onError(cb) {
      errorSubs.add(cb);
      return () => errorSubs.delete(cb);
    },
    onEnd(cb) {
      endSubs.add(cb);
      return () => endSubs.delete(cb);
    },
    isListening() {
      return listening;
    },
  };
}

function normalizeError(raw: string | undefined): VoiceErrorCode {
  switch (raw) {
    case 'no-speech':
    case 'no-match':
    case 'audio-capture':
    case 'not-allowed':
    case 'network':
    case 'aborted':
      return raw;
    default:
      return 'unknown';
  }
}

/**
 * Map the document's lang to a BCP-47 tag Web Speech will accept.
 * Defaults to `zh-CN` if the document lang is Chinese, otherwise `en-US`.
 */
function resolveLang(): string {
  if (typeof document === 'undefined') return 'en-US';
  const docLang = (document.documentElement.lang || navigator.language || 'en').toLowerCase();
  if (docLang.startsWith('zh')) return 'zh-CN';
  return 'en-US';
}

/* -------------------------------------------------------------------------- */
/* Number parser                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Pull a number out of a transcript. Handles:
 *   - "65.5"                       → 65.5
 *   - "65.5 公斤"                  → 65.5   (drops the unit)
 *   - "今天 144 磅"                → 144
 *   - "一百四十五"                 → 145   (Chinese numerals — common cases)
 *   - "一四五点五"                 → 145.5
 *
 * Returns `null` when no plausible number is found. Callers should treat
 * null as "didn't catch that" and surface a retry toast.
 */
export function parseWeightFromTranscript(text: string): number | null {
  const ascii = extractAsciiNumber(text);
  if (ascii !== null) return ascii;

  const chinese = extractChineseNumber(text);
  if (chinese !== null) return chinese;

  return null;
}

/**
 * Match the *last* ASCII number in the string — users typically put the
 * value at the end ("today 65.5 kg"). If a sentence like "from 80 to 70"
 * ever shows up, we'd want the last token; the regex global variant keeps
 * the implementation honest about intent.
 */
function extractAsciiNumber(text: string): number | null {
  const matches = text.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  const raw = matches[matches.length - 1]!;
  const parsed = Number.parseFloat(raw);
  if (!isFinite(parsed)) return null;
  return parsed;
}

/**
 * Chinese number parser.
 *
 * Supports both the canonical digit form (零一二三四五六七八九) and the
 * positional multiplier (十百千万). Decimals use 点. Ranges are explicitly
 * not supported — that's almost certainly the user saying two things.
 *
 * Examples:
 *   一百四十五       → 145
 *   一千二百         → 1200
 *   一万两千三百点五  → 12300.5
 *   零点三           → 0.3
 */
function extractChineseNumber(text: string): number | null {
  const cleaned = text.replace(/[，。！？、 \t]/g, '');
  if (!cleaned) return null;

  const digitMap: Record<string, number> = {
    零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9,
  };
  const unitMap: Record<string, number> = {
    十: 10, 百: 100, 千: 1000, 万: 10000,
  };

  // Try to find a contiguous digit-unit string. The longest match wins
  // because Chinese numbers tend to read top-down (e.g. 一千二百三 = 1*1000
  // + 2*100 + 3, not 1 + 1000 + 2 + 100 + 3).
  let best: { value: number; length: number } | null = null;
  for (let start = 0; start < cleaned.length; start += 1) {
    for (let end = cleaned.length; end > start; end -= 1) {
      const segment = cleaned.slice(start, end);
      if (segment.length < (best?.length ?? 1)) continue;
      const value = tryParseChinese(segment, digitMap, unitMap);
      if (value === null) continue;
      if (!best || segment.length > best.length) {
        best = { value, length: segment.length };
      }
    }
  }

  return best?.value ?? null;
}

function tryParseChinese(
  segment: string,
  digitMap: Record<string, number>,
  unitMap: Record<string, number>,
): number | null {
  // Handle "点" (decimal point). We split on the first 点 and treat the
  // remainder as decimal digits. Anything past 点 must be plain digit
  // characters (Chinese digits).
  const dotIndex = segment.indexOf('点');
  if (dotIndex >= 0) {
    const intPart = segment.slice(0, dotIndex);
    const fracPart = segment.slice(dotIndex + 1);
    if (!/^[零一二两三四五六七八九十百千万]*$/.test(intPart)) return null;
    if (!/^[零一二三四五六七八九]*$/.test(fracPart)) return null;
    const intVal = intPart ? parseChineseInteger(intPart, digitMap, unitMap) : 0;
    if (intVal === null) return null;
    let frac = 0;
    let divisor = 10;
    for (const ch of fracPart) {
      frac += (digitMap[ch] ?? 0) / divisor;
      divisor *= 10;
    }
    return intVal + frac;
  }

  // Pure integer form.
  if (!/^[零一二两三四五六七八九十百千万]+$/.test(segment)) return null;
  return parseChineseInteger(segment, digitMap, unitMap);
}

/**
 * Parse a Chinese integer string. Algorithm:
 *   - Split on 万 (highest common multiplier).
 *   - Each half is processed independently, then summed × (1 or 10000).
 *   - Within a half, scan left → right: a digit preceding a multiplier
 *     contributes digit × multiplier; a multiplier without a preceding
 *     digit (e.g. "十三") contributes 1 × multiplier.
 *   - Bare digits (no multiplier following) add directly.
 */
function parseChineseInteger(
  text: string,
  digitMap: Record<string, number>,
  unitMap: Record<string, number>,
): number | null {
  const wanIndex = text.indexOf('万');
  if (wanIndex >= 0) {
    const left = text.slice(0, wanIndex);
    const right = text.slice(wanIndex + 1);
    const leftVal = left === '' ? 1 : parseChunk(left, digitMap, unitMap, 10000);
    const rightVal = right === '' ? 0 : parseChunk(right, digitMap, unitMap, 10000);
    if (leftVal === null || rightVal === null) return null;
    return leftVal * 10000 + rightVal;
  }
  return parseChunk(text, digitMap, unitMap, 10000);
}

function parseChunk(
  text: string,
  digitMap: Record<string, number>,
  unitMap: Record<string, number>,
  ceiling: number,
): number | null {
  let total = 0;
  let section = 0;
  let prevDigit: number | null = null;

  for (const ch of text) {
    if (ch in digitMap) {
      prevDigit = digitMap[ch]!;
    } else if (ch in unitMap) {
      const unit = unitMap[ch]!;
      if (unit >= ceiling) return null; // unexpected higher multiplier
      if (prevDigit === null) {
        // e.g. 十三 → 1*10 implicit
        section += 1 * unit;
      } else {
        section += prevDigit * unit;
        prevDigit = null;
      }
    } else if (ch === '零') {
      // Zero is a separator only — drop it.
      prevDigit = null;
    } else {
      return null;
    }
  }

  if (prevDigit !== null) section += prevDigit;
  total += section;
  return total;
}
