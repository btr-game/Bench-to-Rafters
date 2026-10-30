// The dev deck (round 24): its own page, built on its own. `npm run build:dev` writes dist-dev/.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: { __DEV_DECK__: 'true' },
  build: { outDir: 'dist-dev', rollupOptions: { input: 'dev.html' } },
});
