// scripts/qa-screenshots.mjs
//
// Drives a headless Chrome via the Chrome DevTools Protocol (over WebSocket)
// to register a user, then walks every page in the app and saves a screenshot.
//
// Usage:
//   node scripts/qa-screenshots.mjs [--base http://127.0.0.1:5173]
//
// Requires: a system Chrome at /Applications/Google Chrome.app/... and a
// running dev server on `--base`. No npm dependencies — uses Node 22's
// built-in `fetch` and `WebSocket`.

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const ARGS = process.argv.slice(2);
function arg(name, fallback) {
  const i = ARGS.indexOf(name);
  return i >= 0 ? ARGS[i + 1] : fallback;
}
const BASE = arg('--base', 'http://127.0.0.1:5173');
const OUT_DIR = arg(
  '--out',
  resolve(REPO_ROOT, 'docs/screenshots/m1'),
);
const CHROME_BIN =
  arg(
    '--chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  );
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2 };

const PROFILE_DIR = '/tmp/chrome-data-pairfit-qa';
const DEBUG_PORT = 9333;

const EMAIL = `qa+${Date.now()}@pairfit.local`;
const PASSWORD = 'pairfit-qa-2026';
const NAME = 'Alex (QA)';

await mkdir(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// 1. Launch Chrome with remote debugging
// ---------------------------------------------------------------------------
const chrome = spawn(
  CHROME_BIN,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--disable-features=Translate,BackForwardCache',
    `--user-data-dir=${PROFILE_DIR}`,
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

// Wait for the debug endpoint to come up
async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (r.ok) {
        const j = await r.json();
        return j.webSocketDebuggerUrl;
      }
    } catch {
      /* not yet */
    }
    await delay(200);
  }
  throw new Error('Chrome debug endpoint never came up');
}

const wsUrl = await getWsUrl();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res);
  ws.addEventListener('error', rej);
});

let msgId = 0;
const pending = new Map();
const events = [];
let pageSessionId = null;

ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(new Error(JSON.stringify(data.error)));
    else resolve(data.result);
  } else if (data.method) {
    events.push(data);
  }
});

function send(method, params = {}, sessionId) {
  const id = ++msgId;
  const msg = { id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  ws.send(JSON.stringify(msg));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

async function waitForEvent(predicate, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const idx = events.findIndex(predicate);
    if (idx >= 0) return events.splice(idx, 1)[0];
    await delay(50);
  }
  throw new Error('waitForEvent timed out');
}

// ---------------------------------------------------------------------------
// 2. Set up a fresh target (tab) and attach
// ---------------------------------------------------------------------------
const { targetInfos } = await send('Target.getTargets');
let pageTarget = targetInfos.find((t) => t.type === 'page');
if (!pageTarget) throw new Error('no page target');
const attached = await send('Target.attachToTarget', {
  targetId: pageTarget.targetId,
  flatten: true,
});
pageSessionId = attached.sessionId;
if (!pageSessionId) throw new Error('attachToTarget returned no sessionId');

await send('Page.enable', {}, pageSessionId);
await send('Runtime.enable', {}, pageSessionId);
await send('Network.enable', {}, pageSessionId);
await send('Emulation.setDeviceMetricsOverride', {
  width: VIEWPORT.width,
  height: VIEWPORT.height,
  deviceScaleFactor: VIEWPORT.deviceScaleFactor,
  mobile: true,
}, pageSessionId);
await send('Emulation.setUserAgentOverride', {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
}, pageSessionId);

async function screenshot(name) {
  const r = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  }, pageSessionId);
  const out = resolve(OUT_DIR, name);
  await writeFile(out, Buffer.from(r.data, 'base64'));
  console.log(`  📸 ${name}`);
  return out;
}

async function navigate(path) {
  const url = `${BASE}${path}`;
  const loaded = waitForEvent(
    (e) =>
      e.method === 'Page.loadEventFired' &&
      events.some(
        (x) => x.method === 'Page.frameNavigated' && x.params?.frame?.url === url,
      ) === false,
    8000,
  ).catch(() => null);
  await send('Page.navigate', { url }, pageSessionId);
  // wait for load + a beat so SPA hydration finishes
  await Promise.race([
    loaded,
    delay(8000),
  ]);
  await delay(800);
}

async function eval_(expression) {
  const r = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, pageSessionId);
  if (r.exceptionDetails) {
    throw new Error(
      `eval failed: ${r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails)}`,
    );
  }
  return r.result?.value;
}

async function setInputValue(label, value) {
  // Try multiple strategies: label-association, placeholder, then name.
  return eval_(`
    (() => {
      const wanted = ${JSON.stringify(value)};
      const labelText = ${JSON.stringify(label)};
      const norm = (s) => (s || '').replace(/[\\s*]+/g, '').toLowerCase();
      const want = norm(labelText);
      const inputs = Array.from(document.querySelectorAll('input,textarea,select'));
      let target = null;
      // 1. aria-label
      target = inputs.find((i) => norm(i.getAttribute('aria-label')) === want);
      // 2. placeholder
      if (!target) target = inputs.find((i) => norm(i.placeholder) === want);
      // 3. associated <label for> (text may include trailing '*' for required)
      if (!target) {
        const lbl = Array.from(document.querySelectorAll('label')).find(
          (l) => norm(l.textContent) === want || norm(l.textContent).startsWith(want),
        );
        if (lbl && lbl.htmlFor) target = document.getElementById(lbl.htmlFor);
      }
      // 4. label containing the input
      if (!target) {
        target = inputs.find((i) => {
          const l = i.closest('label');
          return l && norm(l.textContent) === want;
        });
      }
      // 5. autoComplete
      if (!target && labelText === 'Nickname')
        target = inputs.find((i) => i.autocomplete === 'Nickname');
      if (!target && labelText === 'Email')
        target = inputs.find((i) => i.autocomplete === 'Email' || i.type === 'email');
      if (!target && labelText === 'Password')
        target = inputs.find((i) => i.type === 'password' && i.autocomplete === 'new-password');
      if (!target && labelText === 'Confirm password') {
        const pwInputs = inputs.filter((i) => i.type === 'password' && i.autocomplete === 'new-password');
        target = pwInputs[pwInputs.length - 1];
      }
      if (!target) return { ok: false, reason: 'input not found for ' + labelText };
      const setter = Object.getOwnPropertyDescriptor(
        target.constructor.prototype,
        'value',
      ).set;
      setter.call(target, wanted);
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      // Trigger blur so on-screen validation messages settle.
      target.dispatchEvent(new Event('blur', { bubbles: true }));
      return { ok: true, id: target.id || target.name || target.placeholder };
    })()
  `);
}

console.log(`→ Registering ${EMAIL} via ${BASE}/register`);
await navigate('/register');
await setInputValue('Nickname', NAME);
await setInputValue('Email', EMAIL);
await setInputValue('Password', PASSWORD);
await setInputValue('Confirm password', PASSWORD);

// Re-check the form after filling.
const afterFill = await eval_(`
  (() => {
    return Array.from(document.querySelectorAll('input')).map((i) => ({
      type: i.type,
      auto: i.autocomplete,
      val: i.value,
    }));
  })()
`);
console.log('  after-fill inputs:', JSON.stringify(afterFill));

// Diagnostic: confirm the values landed before submitting.
const formState = await eval_(`
  (() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const out = {};
    for (const i of inputs) {
      const label = i.closest('label')?.textContent?.trim()
        || document.querySelector(\`label[for="\${i.id}"]\`)?.textContent?.trim()
        || i.placeholder
        || i.name;
      out[label || i.type] = i.value;
    }
    return out;
  })()
`);
console.log('  form state:', formState);

// Submit form — find the Submit button.
const submit = await eval_(`
  (() => {
    const btn = Array.from(document.querySelectorAll('button[type="submit"], button')).find(
      (b) => !b.disabled && /create account|sign up|register|join|continue|next/i.test(b.innerText || ''),
    );
    if (!btn) return { ok: false, label: 'no button' };
    btn.click();
    return { ok: true, label: btn.innerText };
  })()
`);
console.log('  submit:', submit);
if (!submit?.ok) throw new Error('register submit button not found');

// After registration the app navigates to onboarding (or /home if already set up).
await delay(3000);

// Confirm auth pointer is set before continuing to protected routes.
const authState = await eval_(`
  (() => ({
    pointer: localStorage.getItem('pairfit:auth'),
    url: location.pathname,
    bodyErrors: Array.from(document.querySelectorAll('.text-danger, [role="alert"], .text-error'))
      .map((n) => n.innerText)
      .filter(Boolean),
  }))()
`);
console.log('  auth state:', JSON.stringify(authState));
if (!authState.pointer || authState.pointer === 'null') {
  throw new Error('auth pointer not set after register — form did not submit');
}

const shots = [];

async function shot(label, path, postWaitMs = 1200) {
  await navigate(path);
  await delay(postWaitMs);
  const out = await screenshot(label);
  shots.push({ label, path, file: out });
}

// 1. Post-register landing — should now be onboarding, but capture it.
await navigate('/onboarding');
await delay(800);
await screenshot('01-onboarding-step1.png');

// 2. Toggle direction to "Gain" to capture a different selection state
console.log('→ Onboarding step 1 (direction)');
await eval_(`
  (() => {
    const card = Array.from(document.querySelectorAll('[role="button"], button, [data-card]')).find(
      (n) => /gain weight/i.test(n.textContent || ''),
    );
    if (card) card.click();
    return card ? 'clicked' : 'no gain card';
  })()
`);
await delay(500);
await screenshot('02-onboarding-direction.png');

// Toggle back to Lose so the rest of the onboarding targets the original direction.
await eval_(`
  (() => {
    const card = Array.from(document.querySelectorAll('[role="button"], button, [data-card]')).find(
      (n) => /lose weight/i.test(n.textContent || ''),
    );
    if (card) card.click();
    return card ? 'clicked' : 'no lose card';
  })()
`);
await delay(300);

await eval_(`
  (() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => /^\\s*continue\\s*$/i.test(b.innerText || ''),
    );
    if (btn) btn.click();
    return btn ? 'clicked' : 'no continue';
  })()
`);
await delay(800);

// 3. Step 2 — weights
console.log('→ Onboarding step 2 (weights)');
await screenshot('03-onboarding-weights.png');

await setInputValue('Starting weight', '72.5');
await setInputValue('Target weight', '65');
await delay(500);

const inputState = await eval_(`
  (() => {
    return Array.from(document.querySelectorAll('input')).map((i) => ({
      auto: i.autocomplete || i.type,
      val: i.value,
      placeholder: i.placeholder,
    }));
  })()
`);
console.log('  onboarding step 2 inputs:', JSON.stringify(inputState));

await eval_(`
  (() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => /^\\s*continue\\s*$/i.test(b.innerText || ''),
    );
    if (btn && !btn.disabled) btn.click();
    return btn ? (btn.disabled ? 'disabled' : 'clicked') : 'no continue';
  })()
`);
await delay(800);

// 4. Step 3 — preview
console.log('→ Onboarding step 3 (preview)');
await screenshot('04-onboarding-preview.png');

// 5. Click "Lock it in" → home with goal set
await eval_(`
  (() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => /lock it in/i.test(b.innerText || ''),
    );
    if (btn) btn.click();
    return btn ? 'clicked' : 'no lock it in';
  })()
`);
await delay(1200);
await shot('05-home-with-goal.png', '/');

// 6. Records tab
await shot('06-records.png', '/records');

// 7. Trends tab
await shot('07-trends.png', '/trends');

// 8. Couple tab
await shot('08-couple.png', '/couple');

// 9. Me / settings tab
await shot('09-me.png', '/me');

// 10. Log weight page (voice entry — BUG-FIX-4/5 surface)
console.log('→ Voice + weight flow');
await navigate('/records/weight');
await delay(800);
await screenshot('10-record-weight.png');

// 11. Log meal page (AI estimate + voice)
await shot('11-record-food.png', '/records/food', 1200);

// 12. Log workout page (MET calorie estimator + voice)
await shot('12-record-exercise.png', '/records/exercise', 1200);

// 13. Trends 7d filter
console.log('→ Trends 7-day filter');
await navigate('/trends');
await delay(800);
await eval_(`
  (() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      /^\\s*7\\s*d(ay)?\\s*$/i.test(b.innerText || ''),
    );
    if (btn) btn.click();
    return btn ? 'clicked' : 'no 7d button';
  })()
`);
await delay(800);
await screenshot('13-trends-7d.png');

// 14. Subscription / Pro placeholder
await shot('14-subscription.png', '/subscription', 1200);

// Close cleanly
ws.close();
chrome.kill();

const { readdir } = await import('node:fs/promises');
const files = await readdir(OUT_DIR);
console.log(`\nDone. ${files.filter((f) => f.endsWith('.png')).length} screenshots in ${OUT_DIR}`);