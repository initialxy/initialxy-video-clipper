import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        // Main process entry
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: [
                'electron',
                // Node.js built-ins must NOT be bundled — Rolldown wraps them in __require() which fails in ESM
                /^node:/,
                'fs',
                'fs/promises',
                'path',
                'child_process',
                'os',
                'url',
                'util',
                'stream',
                'events',
                'crypto',
                'buffer',
                'assert',
                'constants',
                'module',
                'process',
                'querystring',
                'string_decoder',
                'timers',
                'tty',
                'vm',
                'worker_threads',
                'inspector',
                'perf_hooks',
                'dns',
                'net',
                'readline',
                'repl',
                'better-sqlite3',
              ],
            },
          },
        },
      },
      {
        // Preload script
        entry: 'src/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist/preload',
            rollupOptions: {
              external: ['electron'],
            },
            lib: {
              entry: resolve(__dirname, 'src/preload/index.ts'),
              formats: ['cjs'],
              fileName: () => 'index.js',
            },
          },
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@main': resolve(__dirname, 'src/main'),
      '@preload': resolve(__dirname, 'src/preload'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  clearScreen: false,
});
