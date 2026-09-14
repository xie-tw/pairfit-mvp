import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Inject the package version so the data-export snapshot can stamp it
    // without a runtime import of `package.json` (which Vite wouldn't ship
    // to the browser anyway).
    __APP_VERSION__: JSON.stringify(
      JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version,
    ),
  },
})
