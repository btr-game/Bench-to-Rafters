/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: { __DEV_DECK__: 'false' },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 300000 },
});
