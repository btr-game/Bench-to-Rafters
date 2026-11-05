/// <reference types="vitest/config" />
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Round 41: the game's JSX goes through src/i18n's runtime, which draws the engine's lines in the
 * player's language (src/i18n/engine.ts). The dev deck (src/dev) and the runtime itself keep React's. */
function engineText(): Plugin {
  const src = path.resolve(__dirname, 'src') + path.sep;
  const keep = [path.resolve(__dirname, 'src/dev') + path.sep, path.resolve(__dirname, 'src/i18n') + path.sep];
  const to: Record<string, string> = {
    'react/jsx-runtime': path.resolve(__dirname, 'src/i18n/jsx-runtime.ts'),
    'react/jsx-dev-runtime': path.resolve(__dirname, 'src/i18n/jsx-dev-runtime.ts'),
  };
  return {
    name: 'btr-engine-text',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!(source in to) || !importer) return null;
      const file = importer.split('?')[0];
      return file.startsWith(src) && !keep.some((k) => file.startsWith(k)) ? to[source] : null;
    },
  };
}

export default defineConfig({
  plugins: [engineText(), react()],
  base: './',
  test: { include: ['tests/**/*.test.ts'], testTimeout: 300000 },
});
