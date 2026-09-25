import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.stress.ts'], testTimeout: 180000 },
});
