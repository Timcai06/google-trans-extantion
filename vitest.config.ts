import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/architecture/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
