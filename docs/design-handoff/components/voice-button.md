# VoiceButton

> 🆕 需新增 — 路径 `src/components/ui/VoiceButton.tsx`。PF-3 + PF-4 + PF-5 都用。

## 用途

微信长按说话式语音按钮。MVP 最高频的交互 — 录入成本从 60s 打字降到 10s 说话。

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `onResult` | `(text: string, confidence: number) => void` | — | 识别成功的回调 |
| `onError` | `(code: VoiceErrorCode) => void` | — | 失败回调(`'noSpeech' \| 'noMatch' \| 'denied' \| 'network'`) |
| `onStart` | `() => void` | — | 开始录音(可选,用于 analytics) |
| `onEnd` | `() => void` | — | 录音结束(可选) |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'xl'` | 56 / 64 / 80 / 96 px |
| `label` | `string` | `'Tap to talk'` | 屏幕阅读器 / 浮层标签 |
| `placeholder` | `string` | — | 输入框 placeholder(配套用) |
| `disabled` | `boolean` | `false` | 不可用(权限被永久拒绝 / 不支持 SSR) |

## 视觉

### 三态

| 状态 | 视觉 |
|---|---|
| **idle** | 80px 圆形,`bg-brand-500`,`<Mic />` icon 居中,白色,加 `shadow-glow`(ring) |
| **listening**(长按中)| scale 1.08,外圈 pulse ring(`@keyframes pulse-ring` 1s 循环),icon 变 `<Square />` |
| **processing** | spinner 替换 icon,按钮不可点 |

### 浮层

长按 0.3s 后,屏幕上半部分出现半透明黑色 backdrop + 大圆环动画 + 文字"我在听,请讲"。松开后,如果识别成功:显示 transcript "我听到了:今天 65.5 公斤";失败:显示 "没听清,再说一次" + 重试按钮。

## 交互细节

| 手势 | 行为 |
|---|---|
| 鼠标 / 触摸按下 | `pointerdown` → `start()`,0.3s 后显示浮层 |
| 按住拖出按钮(向上 80px)| 取消录音,显示 "松手取消" |
| 松开 | 短于 0.3s 不算录音;否则 `stop()` 并 `onResult` |
| 移动端触觉反馈 | `navigator.vibrate(50)` on press,`navigator.vibrate([20,30,20])` on success |

## 例子

```tsx
<VoiceButton
  size="xl"
  label={t('record.voice.tap')}
  onResult={(text, confidence) => {
    if (confidence > 0.6) {
      setTranscript(text);
      setStage('aiEstimate');
    } else {
      toast({ variant: 'warning', message: t('errors.voiceNoMatch') });
    }
  }}
  onError={(code) => {
    if (code === 'denied') {
      setShowPermissionModal(true);
    } else {
      toast({ variant: 'warning', message: t(`errors.voice${pascal(code)}`) });
      setUseVoice(false); // fallback 到键盘
    }
  }}
/>
```

## 可访问性

- 按钮 `aria-label="Voice input"` + `aria-pressed` 跟随 listening 态。
- 浮层 `<div role="status" aria-live="polite">` 让 SR 播报识别结果。
- 若浏览器不支持 Web Speech API,组件自己检测并隐藏 / 显示"不支持"提示(不阻塞输入)。

## 注意事项

- 不要把识别逻辑塞进组件 — 组件只负责 UI + 录音触发;识别结果通过 `onResult` 回调给上层。
- 必须处理浏览器兼容性:iOS Safari 14.5+ 支持,但 WebKit 前缀必须 (`webkitSpeechRecognition`)。
- 不要忘了 fallback:识别失败时,把焦点切到键盘输入框。
- SSR 安全:`if (typeof window === 'undefined') return null;`

---

## Web Speech API 适配示例(给 Coding Agent)

```ts
// src/lib/speech.ts
type VoiceErrorCode = 'noSpeech' | 'noMatch' | 'denied' | 'network';

interface SpeechRecognitionLike {
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
}

export function createRecognizer(lang: 'en-US' | 'zh-CN'): SpeechRecognitionLike | null {
  const Ctor =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.continuous = false;
  r.interimResults = false;
  r.lang = lang;
  return r;
}

export function mapError(code: string): VoiceErrorCode {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'denied';
  if (code === 'no-speech') return 'noSpeech';
  if (code === 'network') return 'network';
  return 'noMatch';
}
```