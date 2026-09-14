import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Connect, type Plugin, type ViteDevServer } from 'vite';

/**
 * Dev-server middleware that mounts the Vercel-style `/api/*` handlers
 * (currently just `/api/ai/food-estimate`) onto the Vite dev server.
 *
 * Production is handled by Vercel directly. This plugin exists so
 * `npm run dev` doesn't show "Failed to fetch" the moment you try to
 * estimate a meal — the PRD calls this "MVP 用 Vite dev server proxy".
 *
 * The handler source files live under `api/**` and use the Web Fetch
 * signature (`Request` → `Response`) so Vercel + Vite can both consume
 * them. We forward the Node `IncomingMessage` body into a `Request`
 * object, call the default-exported handler, and stream its `Response`
 * back.
 */
function apiDevMiddleware(): Plugin {
  return {
    name: 'pairfit:api-dev',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      const handler: Connect.NextHandleFunction = async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }
        const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

        try {
          let rawBody = '';
          if (req.method === 'POST') {
            rawBody = await new Promise<string>((resolve) => {
              const chunks: Buffer[] = [];
              req.on('data', (chunk) => chunks.push(chunk));
              req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            });
          }

          const mod = await server.ssrLoadModule(url.pathname.replace(/^\//, '') + '.ts');
          const fn = (mod as { default?: unknown }).default ?? mod;
          if (typeof fn !== 'function') {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'no_default_export' }));
            return;
          }

          const body = rawBody ? safeJsonParse(rawBody) : undefined;
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (Array.isArray(value)) headers.set(key, value.join(', '));
            else if (value !== undefined) headers.set(key, value);
          }
          const webReq = new Request(`http://${req.headers.host ?? 'localhost'}${url.pathname}${url.search}`, {
            method: req.method ?? 'GET',
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
          });

          const webRes = await (fn as (req: Request) => Promise<Response>)(webReq);
          res.statusCode = webRes.status;
          webRes.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          const responseBody = await webRes.text();
          res.end(responseBody);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'dev_handler_failed',
              message: err instanceof Error ? err.message : String(err),
              path: url.pathname,
            }),
          );
        }
      };

      server.middlewares.use(handler);
    },
  };
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiDevMiddleware()],
  define: {
    // Inject the package version so the data-export snapshot can stamp it
    // without a runtime import of `package.json` (which Vite wouldn't ship
    // to the browser anyway).
    __APP_VERSION__: JSON.stringify(
      JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version,
    ),
  },
});
