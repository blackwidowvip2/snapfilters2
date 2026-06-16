import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Stamp the service worker's cache name with a unique per-build id so every
// deploy invalidates the previous cache (clients fetch the fresh assets).
function swVersion(): Plugin {
  return {
    name: 'sw-version',
    apply: 'build',
    closeBundle() {
      const file = resolve(__dirname, 'dist/sw.js')
      try {
        const id = Date.now().toString(36)
        const src = readFileSync(file, 'utf8').replace('__SW_VERSION__', id)
        writeFileSync(file, src)
      } catch {
        // sw.js not emitted (e.g. partial build) — nothing to stamp.
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), swVersion()],
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: !!process.env.PORT,
  },
})
